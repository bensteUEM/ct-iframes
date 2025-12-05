import { churchtoolsClient } from "@churchtools/churchtools-client";
import type { Event } from "./utils/ct-types";

/** Generate a HTML element which can display next events by date
 * @returns HTML div element
*/
export async function generateEventList(): Promise<HTMLDivElement> {
    let content = document.createElement("div");
    let events = await getNextEvents(5)

    if (events.length === 0) {
        content.innerHTML = "<p>No upcoming events.</p>";
    } else {
        // Use eventName property of each event
        const dates = events.map(event => new Date(String(event.startDate)));
        const uniqueDates = Array.from(new Set(dates));

        console.log("Event Dates:", uniqueDates);

        for (let date of uniqueDates) {
            const dateHeader = document.createElement("h3");
            dateHeader.textContent = date.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' });
            content.appendChild(dateHeader);

            const eventsForDate = events.filter(event => {
                const eventDate = new Date(String(event.startDate));
                return eventDate.toDateString() === date.toDateString();
            });
            const ul = document.createElement("ul");

            for (let event of eventsForDate) {
                const li = document.createElement("li");
                li.textContent = `${new Date(String(event.startDate)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${event.name}`;
                ul.appendChild(li);
            }
            content.appendChild(ul);
        }
    }
    return content
}

/**
 * fetch list of next events using specified params
 * @param limit 
 * @returns list of events applicable to filter
 */
async function getNextEvents(limit: number): Promise<Event[]> {
    const events = await churchtoolsClient.get<Event[]>(`/events?direction=forward&limit=${limit}`);

    console.log("Retrieved following events:", events);
    return events;
}
