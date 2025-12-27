import type { Person } from "./utils/ct-types";
import { churchtoolsClient } from "@churchtools/churchtools-client";
import { generateEventList } from "./events";
import {
    checkPermissions,
    applyTokenExpiration,
    generateAuthHTML,
    loginSavedUser,
} from "./auth";

// only import reset.css in development mode
if (import.meta.env.MODE === "development") {
    //import("./utils/reset.css");
    import("../20251026_ct_styles.css");
}

declare const window: Window &
    typeof globalThis & {
        settings: { base_url?: string };
    };

const baseUrl = window.settings?.base_url ?? import.meta.env.VITE_BASE_URL;
churchtoolsClient.setBaseUrl(baseUrl);

const username = import.meta.env.VITE_USERNAME;
const password = import.meta.env.VITE_PASSWORD;

if (import.meta.env.MODE === "development" && username && password) {
    await churchtoolsClient.post("/login", { username, password });
}

const KEY = import.meta.env.VITE_KEY;
export { KEY };

/* end of initializiation */

/** Main plugin function */
async function main() {
    /* HTML Updates */
    const params = Object.fromEntries(
        new URLSearchParams(window.location.search),
    );
    const embedded = params["embedded"] === "true";

    // Check login
    let login = await churchtoolsClient.get<Person>(`/whoami`);
    let loginAvailable = login.id != -1;
    console.log("Initial Extension login with:", login);
    // TODO implement dedicated permission check #11
    if (!loginAvailable) {
        loginAvailable = await loginSavedUser();
        if (loginAvailable) {
            login = await churchtoolsClient.get<Person>(`/whoami`);
        }
        // TODO implement dedicated permission check #11
    } else {
        applyTokenExpiration();
    }
    console.log("Login available:", loginAvailable);

    const app = document.querySelector<HTMLDivElement>("#app")!;
    app.innerHTML = `
<div class="container d-flex flex-column align-items-center justify-content-start min-vh-100 gap-3">

</div>
`;
    const container = app.querySelector(".container")!;

    // add possibility to share current users login
    if ((await checkPermissions(true)) && !embedded) {
        container.appendChild(await generateAuthHTML());
    }
    // explanation
    if (!embedded) {
        // Create explanation div
        const explanation = document.createElement("div");

        // Set id and classes
        explanation.id = "explanation";
        explanation.className = "p-4 mb-4 bg-gray-100 rounded shadow text-left";

        // Set inner HTML
        explanation.innerHTML = `
            <p>
                This extension provides additional iframes for embedding ChurchTools into pages with restricted access.
                This applies, e.g., to all pages using Gemeindebaukasten (ELKW) which do not allow custom plugins or JS code.
            </p>
            <p>
                If you open this extension within ChurchTools it will show the viewname, how it looks, and additional explanation.
                Using the <code>embedded=true</code> option in addition to a viewname, the content from the black box can be displayed on its own.
            </p>
            <p>
                To ensure this works, "Public User" needs to have permissions to view this plugin.
                At present, public access without login is problematic because of API permissions. See 
                <a href="https://github.com/bensteUEM/ct-iframes/issues/3" target="_blank" rel="noopener noreferrer">
                Github issue
                </a> for more details.
            </p>
            `;

        // Append to container
        container.appendChild(explanation);
    }

    // event list
    if (
        (params["view"] === "nextServicesWrapper" || !params["view"]) &&
        loginAvailable
    ) {
        console.log("Generating event list...");

        const specialDayNameCalendarIds =
            "specialDayNameCalendarIds" in params
                ? params["specialDayNameCalendarIds"]
                      .split(",")
                      .map((s) => Number(s.trim()))
                : [];

        let events = await generateEventList(specialDayNameCalendarIds);

        if (embedded) {
            container.appendChild(events);
        } else {
            console.log("Wrapping event list...");
            container.appendChild(
                await wrapExplanationDiv(events, "nextServicesWrapper"),
            );
        }
    }

    // Conditionally add dev-only welcome section
    if (import.meta.env.MODE === "development" && !embedded) {
        const devHeader = document.createElement("div");
        devHeader.className = "p-4 mb-4 bg-gray-100 rounded shadow text-center";

        const h1 = document.createElement("h1");
        h1.className = "text-4xl font-bold";
        h1.textContent = `Welcome ${login.firstName} ${login.lastName}`;

        const subDiv = document.createElement("div");
        subDiv.className = "text-gray-500 text-sm";
        subDiv.textContent = `ChurchTools at ${baseUrl}`;

        devHeader.appendChild(h1);
        devHeader.appendChild(subDiv);

        // Insert at the top of the container
        container.insertBefore(devHeader, container.firstChild);
    }

    await churchtoolsClient.post("/logout");
}

/**
 * Create a div wrapper which explains how to use the view
 * @param viewname - name of the view to be used
 * @returns div which explains how to use the view
 */
async function wrapExplanationDiv(
    view: HTMLDivElement,
    viewname: string,
): Promise<HTMLDivElement> {
    const wrapper = document.createElement("div");
    wrapper.classList.add(
        viewname,
        "p-4",
        "mb-4",
        "bg-gray-100",
        "rounded",
        "shadow",
        "text-left",
    );

    let viewHeader = document.createElement("h3");
    viewHeader.textContent = `View: ${viewname}`;
    viewHeader.className = "text-4xl font-bold";
    wrapper.appendChild(viewHeader);

    view.style.border = "1px solid #000";
    wrapper.appendChild(view);

    const howto = document.createElement("div");
    howto.textContent = `To embed this iframe, use the URL below including its GET params`;
    howto.appendChild(document.createElement("br"));

    let targetUrl =
        window.location.origin +
        window.location.pathname +
        `?view=${viewname}&embedded=true`;

    const link = document.createElement("a");
    link.textContent = targetUrl;
    link.href = targetUrl;

    howto.appendChild(link);
    if (viewname == "nextServicesWrapper") {
        const link2 = document.createElement("a");
        link2.textContent =
            "It is possible to add a , seperated list of specialDayNameCalendarIds";
        link2.href = targetUrl + "&specialDayNameCalendarIds=52";
        howto.appendChild(document.createElement("br"));
        howto.appendChild(link2);
    }

    wrapper.appendChild(howto);

    return wrapper;
}

main();
