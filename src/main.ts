import type { Person } from "./utils/ct-types";
import { churchtoolsClient } from "@churchtools/churchtools-client";
import { generateEventList } from "./events"

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

console.log(username, password);

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
    const params = Object.fromEntries(new URLSearchParams(window.location.search));
    const embedded = params["embedded"] === "true";

    const app = document.querySelector<HTMLDivElement>("#app")!;
    app.innerHTML = `
<div class="container d-flex flex-column align-items-center justify-content-start min-vh-100 gap-3">
    <div id="explanation" class="p-4 mb-4 bg-gray-100 rounded shadow text-left" style="width: 100%; max-width: 800px;">
    This extension provides additional iframes for embedding ChurchTools into pages with restricted access.
    This applies e.g. to all pages using Gemeindebaukasten (ELKW) which do not allow custom plugins or JS code.
    </br>
    If you open this extension within ChurchTools it will show viewname, how it looks and additional explanation.
    Using the embedded=true option in addition to a viewname the content from the black box can be displayed on its own. 
    </br>
    To ensure this works "Public User" needs to have permissions to view this plugin.
    At present public access without login is problematic because of API permissions. See
    <a href="https://github.com/bensteUEM/ct-iframes/issues/3">Github issue</a> for more details.
    </div>
</div>
`;
    const container = app.querySelector(".container")!;

    // event list
    if (params["view"] === "nextServicesWrapper" || !params["view"]) {
        console.log("Generating event list...");
        let events = await generateEventList()
        if (embedded) {
            container.appendChild(events);
        }
        else {
            console.log("Wrapping event list...");
            container.appendChild(await wrapExplanationDiv(events, "nextServicesWrapper"));
        }
    }

    // Conditionally add dev-only welcome section
    if (import.meta.env.MODE === "development" && !embedded) {
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
        container.insertBefore(devHeader, container.firstChild);
    }
}

/**
 * Create a div wrapper which explains how to use the view
 * @param viewname - name of the view to be used
 * @returns div which explains how to use the view
 */
async function wrapExplanationDiv(view: HTMLDivElement, viewname: string): Promise<HTMLDivElement> {
    const wrapper = document.createElement("div");
    wrapper.className = viewname;


    let viewHeader = document.createElement("h3")
    viewHeader.textContent = `View: ${viewname}`
    viewHeader.className = "text-4xl font-bold";
    wrapper.appendChild(viewHeader);

    view.style.border = "1px solid #000";
    wrapper.appendChild(view);

    const howto = document.createElement("div");
    howto.textContent = `To embed this iframe, use the URL below including its GET params`;
    howto.appendChild(document.createElement("br"));

    let targetUrl = window.location.origin + window.location.pathname + `?view=${viewname}&embedded=true`

    const link = document.createElement("a");
    link.textContent = targetUrl;
    link.href = targetUrl;

    howto.appendChild(link)
    wrapper.appendChild(howto);

    return wrapper;
}

main();
