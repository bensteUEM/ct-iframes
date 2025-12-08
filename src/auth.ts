/**
 * This file implements auth functionality taking into account it's content should be accessed by unregistered users.
 *
 * Concept:
 * 1. Create hardcoded tech user with access to KV store if not exists
 * 2. Check tech user permissions to view login category in KV store
 * 3. Any registered user can update the KV store login token with it's own
 * 4. Login token saved in KV store should expire after certain time
 */

import { AxiosError } from "axios";
import { churchtoolsClient } from "@churchtools/churchtools-client";
import type {
    CustomModulePermission,
    GlobalPermissions,
    Person,
} from "./utils/ct-types";
import {
    deleteCustomDataValue,
    getCustomDataCategory,
    getCustomDataValues,
} from "./utils/kv-store";
import {
    getLogin,
    resetStoredCategories,
    setLogin,
    type LoginValueData,
} from "./persistance";

declare const window: Window &
    typeof globalThis & {
        settings: { base_url?: string };
    };

const baseUrl = window.settings?.base_url ?? import.meta.env.VITE_BASE_URL;

const TECH_USERNAME = "ct-iframes-tech-user";
const TECH_PASSWORD = `${baseUrl}A1!`;
// console.log(TECH_USERNAME, TECH_PASSWORD);

/* Helper method to create button base with some formats
 * @param text: text value to be displayed on button
 * @param additionalClasses: list of classes to add e.g. bg-color
 * @param onclick: method to execute
 * @returns: html button
 *
 */
function createButton(
    text: string,
    additionalClasses: string[],
    onClick: () => Promise<void>,
) {
    const btn = document.createElement("button");
    btn.classList.add(
        "c-button",
        "c-button__S",
        "c-button__primary",
        "rounded-sm",
        "text-body-m-emphasized",
        "gap-2",
        "justify-center",
        "px-4",
        "py-2",
        "m-2",
        "text-white",
        ...additionalClasses,
    );
    btn.textContent = text;
    btn.onclick = onClick;
    return btn;
}

/**
 * Generate HTML div allowing user to share current login or revoke token
 * @returns DIV element
 */

export function generateAuthHTML(): HTMLDivElement {
    const container = document.createElement("div");
    container.className = "p-4 mb-4 bg-gray-100 rounded shadow text-left";

    container.appendChild(
        createButton(
            "Share current user login",
            ["bg-green-b-bright"],
            shareCurrentLogin,
        ),
    );

    container.appendChild(
        createButton(
            "Revoke saved login token",
            ["bg-orange-b-bright"],
            revokeToken,
        ),
    );

    container.appendChild(
        createButton(
            "Check saved login expiry",
            ["bg-gray-b-bright"],
            async () => {
                const days = await checkTokenExpirationValidity();
                alert(`Token expires in ${days.toFixed(1)} days`);
            },
        ),
    );

    return container;
}

/** Automatically create a new tech user if it doesn't exist */
export async function createTechUserIfNotExists(): Promise<void> {
    try {
        const users = await churchtoolsClient.get<Person[]>(
            `/persons?username=${TECH_USERNAME}`,
        );

        if (users.length > 0) {
            console.log("Tech user already exists.");
            return;
        }

        const minimalUserInfo = {
            firstName: "CT Iframes",
            lastName: "Tech User",
            cmsUserId: TECH_USERNAME,
            departmentIds: [1],
            statusId: 0,
            campusId: 0,
            email: "no-mail@nomail.xx",
            privacyPolicyAgreementTypeId: 1,
            privacyPolicyAgreementWhoId: 1,
            privacyPolicyAgreementDate: "1900-01-01",
        };

        const newUser = await churchtoolsClient.post(
            "/persons",
            minimalUserInfo,
        );
        console.log(
            "Tech user created automatically - please ensure correct password and permissions -> see Readme.md",
            newUser,
        );
        // TODO add permissions to kv store to user #12
    } catch (error) {
        console.error("Error creating tech user:", error);
        throw error;
    }
}
/** This methods calls logout for API and tries login with dedicated tech user
 */
export async function loginTechUser(): Promise<boolean> {
    //console.log("Trying login with: ", TECH_USERNAME, TECH_PASSWORD);
    await churchtoolsClient.post("/logout");

    try {
        await churchtoolsClient.post("/login", {
            username: TECH_USERNAME,
            password: TECH_PASSWORD,
        });
        console.log(
            "Logged in with tech user.",
            await churchtoolsClient.get("/whoami"),
        );
        return true;
    } catch (err: AxiosError | any) {
        console.error(
            "Error logging in with tech user:",
            err.response?.data?.message,
        );
        await createTechUserIfNotExists();
        return false;
    }
}

/**
 * Make user login using tech user to retrieve stored login and use it
 */
export async function loginSavedUser(): Promise<boolean> {
    const techLoginSuccess = await loginTechUser();
    if (!techLoginSuccess) return false;

    const hasPermission = await checkPermissions(false);
    if (!hasPermission) return false;

    const login = await getLogin();
    if (!login) return false;

    await churchtoolsClient.post("/logout");

    try {
        await churchtoolsClient.loginWithToken(login.token);
        console.log(
            "Logged in with saved token.",
            await churchtoolsClient.get("/whoami"),
        );
        return true;
    } catch (err: AxiosError | any) {
        console.error("Token login failed:", err?.response?.data?.message);
        return false;
    }
}

/**
 * check if current user has permissions to custom data category userd for longin storage
 * @param writeAccess - checks if write access otherwise defaults to read access
 * @returns if permission is granted
 */
export async function checkPermissions(writeAccess = false): Promise<boolean> {
    const permissions =
        await churchtoolsClient.get<GlobalPermissions>(`/permissions/global`);
    //console.log("User permissions fetched:", permissions);

    const modulePermissions = permissions[
        "ct-iframes"
    ] as CustomModulePermission;
    //console.log("Module permissions fetched:", modulePermissions);

    const categoryPermissions =
        modulePermissions[`${writeAccess ? "edit" : "view"} custom category`] ??
        [];

    const loginCategory = await getCustomDataCategory("login");

    if (!loginCategory) return false;

    const hasPermission = categoryPermissions.includes(loginCategory.id);
    console.log("Permission check:", hasPermission ? "OK" : "DENIED");

    return hasPermission;
}

/**
 * Save login user and token for future iframe usage
 * 1. check if current user has permissions to share login
 * 2. delete previous logins
 * 3. retrive current user token and store it
 */
export async function shareCurrentLogin(): Promise<void> {
    if (!(await checkPermissions(true))) {
        console.error("No write access to login storage.");
        return;
    }
    if (!(await getCustomDataCategory("login"))) {
        await resetStoredCategories();
    }

    const myUser = await churchtoolsClient.get<Person>("/whoami");
    console.log("Current user is:", myUser);

    await deleteSavedLogins();

    const token = await churchtoolsClient.get<string>(
        `/persons/${myUser.id}/logintoken`,
    );

    await setLogin(`${myUser.firstName} ${myUser.lastName}`, token);

    console.log("Shared current login token.");
}

/**
 * Revoke user token and remove from stored logins
 */
export async function revokeToken(): Promise<void> {
    if (!(await checkPermissions(true))) {
        console.error("No write access to login storage.");
        return;
    }

    const myUser = await churchtoolsClient.get<Person>("/whoami");
    console.log("Current user is:", myUser);
    await churchtoolsClient.deleteApi(`/persons/${myUser.id}/logintoken`);

    await deleteSavedLogins();

    console.log("Login token revoked.");
}

async function deleteSavedLogins(): Promise<void> {
    const category = await getCustomDataCategory("login");
    if (!category) return;

    const loginValues = await getCustomDataValues<LoginValueData>(category.id);

    await Promise.all(
        loginValues.map((v) => deleteCustomDataValue(category.id, v.id)),
    );
}

/**
 * Check how long the token is valid
 * @returns number of days still valid
 */
export async function checkTokenExpirationValidity(): Promise<number> {
    const category = await getCustomDataCategory("login");
    if (!category) return -1;

    const loginValues = await getCustomDataValues<LoginValueData>(category.id);

    if (!loginValues.length) {
        console.log("No stored login found.");
        return -1;
    }

    const expiresAt = new Date(loginValues[0].expires).getTime();
    const diffMs = expiresAt - Date.now();
    const diffDays = diffMs / (1000 * 60 * 60 * 24); // convert ms → days

    console.log("Token expires in days:", diffDays);

    return diffDays;
}

/**
 * Loads token and checks if expired - if yes delete it
 */
export async function applyTokenExpiration(): Promise<void> {
    const daysLeft = await checkTokenExpirationValidity();
    if (daysLeft < 0) {
        await revokeToken();
    }
}
