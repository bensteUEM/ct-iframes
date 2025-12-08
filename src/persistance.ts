/** Persisting values with KV-store usage **/

import type { CustomModuleDataCategory } from "./utils/ct-types";
import {
    createCustomDataCategory,
    createCustomDataValue,
    getCustomDataCategories,
    getCustomDataCategory,
    getCustomDataValues,
    getModule,
} from "./utils/kv-store";

/* Custom FilterData definition */
export interface LoginValueData {
    username: string;
    token: string;
    expires: Date;
}

const LOGIN_CATEGORY_NAME = "login";

/** Reset stored categories for all users if they don't exist
 * @return {Promise<boolean>} - true if reset was finished
 */
export async function resetStoredCategories(): Promise<boolean> {
    let category = await getCustomDataCategory(LOGIN_CATEGORY_NAME);
    if (category) {
        console.log("Login category already exists.");
        return true;
    }

    console.log("Login category missing → creating...");

    const dataSchema = JSON.stringify({
        type: "object",
        properties: {
            username: { type: "string" },
            token: { type: "string" },
            expires: { type: "date" },
        },
        required: ["username", "token", "expires"],
    });

    const module = await getModule();
    category = await createCustomDataCategory({
        customModuleId: module.id,
        name: LOGIN_CATEGORY_NAME,
        shorty: LOGIN_CATEGORY_NAME,
        description:
            "Stores a token which can be used to login with a user which has access to privileged information",
        data: dataSchema,
    });

    console.log("Created login category:", category);
    return true;
    return true;
}

/**
 * Store login info for user if user has permissions to do so
 * @param username - username to store
 * @param token - token to store
 * @return true if stored successfully
 */
export async function setLogin(
    username: string,
    token: string,
): Promise<boolean> {
    try {
        const category =
            await getCustomDataCategory<LoginValueData>(LOGIN_CATEGORY_NAME);
        if (category === undefined) {
            await resetStoredCategories();
        }

        const expires = new Date();
        expires.setMonth(expires.getMonth() + 12);

        await createCustomDataValue({
            dataCategoryId: category!.id,
            value: JSON.stringify({
                username,
                token,
                expires: expires,
            }),
        });

        console.log("Stored login for user:", username);
        return true;
    } catch (err) {
        console.error("Failed to store login:", err);
        return false;
    }
}

/**
 * Retrieve stored login info for user
 * @returns The first login info or null
 */
export async function getLogin(): Promise<LoginValueData | null> {
    try {
        console.log("Retrieving stored login...");

        const category =
            await getCustomDataCategory<LoginValueData>(LOGIN_CATEGORY_NAME);

        if (!category) return null;

        const loginValues = await getCustomDataValues<LoginValueData>(
            category.id,
        );

        if (!loginValues.length) {
            console.log("No login values found.");
            return null;
        }

        const login = loginValues[0];

        console.log("Fetched login:", login);
        return login;
    } catch (err) {
        console.error("Failed to retrieve login:", err);
        return null;
    }
}
