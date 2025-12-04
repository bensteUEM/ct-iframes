import type { Person } from "./utils/ct-types";
import { churchtoolsClient } from "@churchtools/churchtools-client";
import {generateEventList} from "./events"

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

const user = await churchtoolsClient.get<Person>(`/whoami`);

/** Main plugin function */
async function main() {
    /* HTML Updates */
    //addBootstrapStyles();

    const app = document.querySelector<HTMLDivElement>("#app")!;
    app.innerHTML = `
<div class="container d-flex flex-column align-items-center justify-content-start min-vh-100 gap-3">
    <div class="container" id="nextServicesWrapper"></div>
</div>
`;

    // Conditionally add dev-only welcome section
    if (import.meta.env.MODE === "development") {
        const devHeader = document.createElement("div");
        devHeader.className = "p-4 mb-4 bg-gray-100 rounded shadow text-center";

        const h1 = document.createElement("h1");
        h1.className = "text-4xl font-bold";
        h1.textContent = `Welcome ${user.firstName} ${user.lastName}`;

        const subDiv = document.createElement("div");
        subDiv.className = "text-gray-500 text-sm";
        subDiv.textContent = `ChurchTools at ${baseUrl}`;

        devHeader.appendChild(h1);
        devHeader.appendChild(subDiv);

        // Insert at the top of the container
        const container = app.querySelector(".container")!;
        container.insertBefore(devHeader, container.firstChild);

        // Insert next Services for debugging
        const nextServicesWrapper = app.querySelector("#nextServicesWrapper")!;
        let events = await generateEventList()
        nextServicesWrapper.insertBefore(events, nextServicesWrapper.firstChild);
    }
}

main();
