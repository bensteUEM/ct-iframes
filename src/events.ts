import { churchtoolsClient } from "@churchtools/churchtools-client";
import type { Event } from "./utils/ct-types";

/** Generate a HTML element which can display next events by date
 * @returns HTML div element
*/
export async function generateEventList(): Promise<HTMLDivElement> {
    let content = document.createElement("div");
    let events = await getNextEvents([2], 10);

    if (events.length === 0) {
        content.innerHTML = "<p>No upcoming events.</p>";
    } else {
        // Helper function to truncate time
        const truncateTime = (date: Date): Date => {
            return new Date(date.getFullYear(), date.getMonth(), date.getDate());
        };
        // Use eventName property of each event

        // Get unique dates
        const uniqueDates = Array.from(
            new Set(events.map(event => truncateTime(new Date(String(event.startDate))).getTime()))
        ).map(time => new Date(time));

        //console.log("Event Dates:", uniqueDates);

        for (let date of uniqueDates) {
            // filter date to each iteration
            const eventsForDate = events.filter(event => {
                const eventDate = new Date(String(event.startDate));
                return truncateTime(eventDate).getTime() === date.getTime();
            });

            // create header for each date
            const dateHeader = document.createElement("h3");
            dateHeader.textContent = date.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' });
            content.appendChild(dateHeader);


            console.log(`Events for ${date.toDateString()}:`, eventsForDate);

            // create a list for each date
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
async function getNextEvents(calendarIds: number[] = [], limit: number = 5): Promise<Event[]> {
    const events = await churchtoolsClient.get<Event[]>(`/events`);

    console.log("Fetched events from CT:", events[0].calendar!.domainIdentifier, calendarIds.includes(Number(events[0].calendar!.domainIdentifier)));
    let filteredEvents: Event[] = events.filter(event => {
        // Filter by calendar IDs if provided
        if (calendarIds.length > 0 && calendarIds.includes(Number(event.calendar!.domainIdentifier))) {
            return true;
        }
    });


    let limitedEvents: Event[] = filteredEvents.slice(0, limit)

    console.log("Retrieved following events:", limitedEvents);
    return limitedEvents;
}
