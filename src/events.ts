import { churchtoolsClient } from "@churchtools/churchtools-client";
import type { Event } from "./utils/ct-types";
import {
    generateCalendarTitleReplacement,
    getCalendarAppointment,
    getSpecialDayName,
} from "./calendars";
import { getTitleNameServices } from "./event_service_transformation";
import { getResourceNames } from "./resources";

/** Generate a HTML element which can display next events by date
 * @param specialDayNameCalendarIds - optional array of ids of calendards to use for special day name lookup
 * @returns HTML div element
 */
export async function generateEventList(
    specialDayNameCalendarIds: number[] = [],
): Promise<HTMLDivElement> {
    let content = document.createElement("div");

    /* Configuration Section - samples apply to ELKW1610.krz.tools */
    const CONSIDERED_CALENDAR_IDS = [2];
    const CONSIDERED_PROGRAM_SERVICES = [1];
    const CONSIDERED_PROGRAM_TITLE_GROUPS = [89, 355, 358, 361, 367, 370, 373];
    const CONSIDERED_RESOURCE_IDS = [-1, 8, 20, 21, 16, 17];

    let events = await getNextEvents(CONSIDERED_CALENDAR_IDS, 10);

    if (events.length === 0) {
        content.innerHTML = "<p>No upcoming events.</p>";
    } else {
        // Helper function to truncate time
        const truncateTime = (date: Date): Date => {
            return new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate(),
            );
        };
        // Use eventName property of each event

        // Get unique dates
        const uniqueDates = Array.from(
            new Set(
                events.map((event) =>
                    truncateTime(new Date(String(event.startDate))).getTime(),
                ),
            ),
        ).map((time) => new Date(time));

        //console.log("Event Dates:", uniqueDates);

        for (let date of uniqueDates) {
            // filter date to each iteration
            const eventsForDate = events.filter((event) => {
                const eventDate = new Date(String(event.startDate));
                return truncateTime(eventDate).getTime() === date.getTime();
            });

            // create header for each date
            const dateHeader = document.createElement("h3");
            dateHeader.id = "dateHeader";

            const dateName = document.createElement("span");
            dateName.id = "dateName";
            dateName.textContent =
                date.toLocaleDateString("de-DE", {
                    weekday: "long",
                }) + " ";

            const dateDate = document.createElement("span");
            dateDate.id = "dateDate";
            dateDate.textContent =
                date.toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                }) + " ";
            dateHeader.appendChild(dateName);
            dateHeader.appendChild(dateDate);

            content.appendChild(dateHeader);

            // create header for each date
            const specialDayHeader = document.createElement("span");
            specialDayHeader.textContent = await getSpecialDayName(
                date,
                specialDayNameCalendarIds,
            );
            specialDayHeader.id = "specialDayHeader";
            dateHeader.appendChild(specialDayHeader);

            console.log(`Events for ${date.toDateString()}:`, eventsForDate);

            // create a list for each date
            const ul = document.createElement("ul");
            for (let event of eventsForDate) {
                const li = document.createElement("li");

                const eventTime = document.createElement("span");
                eventTime.id = "eventTime";
                eventTime.textContent = new Date(
                    String(event.startDate),
                ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                });

                /* Event Title with possible Appendix from Calendar Appointment */
                const calendarAppointment = await getCalendarAppointment(
                    Number(event.calendar?.domainIdentifier),
                    Number(event.appointmentId),
                );

                const eventTitle = document.createElement("span");
                eventTitle.id = "eventTitle";
                eventTitle.textContent = await generateCalendarTitleReplacement(
                    calendarAppointment?.title ?? "",
                    calendarAppointment?.subtitle ?? "",
                );

                /* Event Title Name Services addition */
                const eventTitleNameServices = document.createElement("span");
                eventTitleNameServices.id = "eventTitleNameServices";
                eventTitleNameServices.textContent = await getTitleNameServices(
                    Number(event.id),
                    CONSIDERED_PROGRAM_SERVICES,
                    CONSIDERED_PROGRAM_TITLE_GROUPS,
                );

                /* Event Special Service addition */
                const eventSpecialService = document.createElement("span");
                eventSpecialService.id = "eventSpecialService";
                eventSpecialService.textContent =
                    await genereateEventSpecialService(event);

                /* Event Resource Name */
                const eventResourceName = document.createElement("span");
                eventResourceName.id = "eventResourceName";

                if (event.startDate && event.name) {
                    const eventResourceNames = await getResourceNames(
                        event.name,
                        new Date(event.startDate),
                        CONSIDERED_RESOURCE_IDS,
                    );
                    eventResourceName.textContent = eventResourceNames[0] || "";
                }

                /* Combine all parts including spacers if content */
                li.appendChild(eventTime);

                if (eventTitle.textContent.length > 0) {
                    li.appendChild(
                        Object.assign(document.createElement("span"), {
                            id: "eventSpacerTitle",
                            textContent: " - ",
                        }),
                    );
                    li.appendChild(eventTitle);
                }

                if (eventTitleNameServices.textContent.length > 0) {
                    li.appendChild(
                        Object.assign(document.createElement("span"), {
                            id: "eventSpacerTitleNameServices",
                            textContent: " - ",
                        }),
                    );
                    li.appendChild(eventTitleNameServices);
                }

                if (eventSpecialService.textContent.length > 0) {
                    li.appendChild(
                        Object.assign(document.createElement("span"), {
                            id: "eventSpacerSpecialService  ",
                            textContent: " - ",
                        }),
                    );
                    li.appendChild(eventSpecialService);
                }

                if (eventResourceName.textContent.length > 0) {
                    li.appendChild(
                        Object.assign(document.createElement("span"), {
                            id: "eventSpacerResourceName",
                            textContent: " - ",
                        }),
                    );
                    eventResourceName.textContent =
                        "[" + eventResourceName.textContent + "]";
                    li.appendChild(eventResourceName);
                }

                ul.appendChild(li);
            }
            content.appendChild(ul);
        }
    }
    return content;
}

/**
 * fetch list of next events using specified params
 * @param limit
 * @returns list of events applicable to filter including eventServices
 */
async function getNextEvents(
    calendarIds: number[] = [],
    limit: number = 5,
): Promise<Event[]> {
    const events = await churchtoolsClient.get<Event[]>(
        `/events?include=eventServices`,
    );
    console.log(
        "Fetched events from CT:",
        events[0].calendar!.domainIdentifier,
        calendarIds.includes(Number(events[0].calendar!.domainIdentifier)),
    );
    let filteredEvents: Event[] = events.filter((event) => {
        // Filter by calendar IDs if provided
        if (
            calendarIds.length > 0 &&
            calendarIds.includes(Number(event.calendar!.domainIdentifier))
        ) {
            return true;
        }
    });

    let limitedEvents: Event[] = filteredEvents.slice(0, limit);

    console.log("Retrieved following events:", limitedEvents);
    return limitedEvents;
}

/**
 * Generate special service string for event if applicable
 * e.g. if service "Posaunenchor" is assigned to event, return " mit Posaunenchor"
 * mapping based on service ids
 * @param event reference event with Services
 * @return special service string or empty string
 */
async function genereateEventSpecialService(event: Event): Promise<string> {
    const specialServiceMap: Record<number, string> = {
        89: "Chor",
        92: "Chor",
        93: "Chor",
        96: "Chor",
        54: "InJoy",
        10: "Musikteam",
        61: "Posaunenchor",
        73: "Abendmahl",
        127: "Taufe",
    };

    const labels = new Set<string>();

    if (!event?.eventServices) {
        console.log("No event services found.");
        return "";
    }

    for (const service of event?.eventServices) {
        if (!service.serviceId) continue;
        const label = specialServiceMap[service.serviceId];
        if (label) labels.add(label);
    }
    console.log("Special service labels:", labels);

    const result = [...labels].join(", ");  

    return result ? ` mit ${result}` : "";
}
