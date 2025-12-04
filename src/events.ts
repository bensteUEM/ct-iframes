import { churchtoolsClient } from "@churchtools/churchtools-client";
import type { Event } from "./utils/ct-types";

/** Generate a list of next events 
 * @returns HTML div element
*/
export async function generateEventList(): Promise<HTMLDivElement> {
    let content = document.createElement("div");
    let events = await getNextEvents(5)

    if (events.length === 0) {
        content.innerHTML = "<p>No upcoming events.</p>";
    } else {
        // Use eventName property of each event
        const list = events
            .map(event => `<p>${new Date(String(event.startDate)).toLocaleString()} ${event.name}</p>`)
            .join("");
        content.innerHTML = list;
    }
    return content
}

async function getNextEvents(limit: number): Promise<Event[]> {
    const events = await churchtoolsClient.get<Event[]>(`/events?direction=forward&limit=${limit}`);

    console.log(events);
    return events;
}
