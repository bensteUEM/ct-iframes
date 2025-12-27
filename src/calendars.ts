import { churchtoolsClient } from "@churchtools/churchtools-client";
import type { AppointmentCalculatedWithIncludes } from "./utils/ct-types";

/**
 * retrieve the first availables title from a list of calendars for a specified date
 * This can be used to retrieve special day names if each day has exactly one relevant specialdayname appointment
 * 
 * @param date to lookfor
 * @param calendarIds used for lookup
 * @returns title of the first appointment matching both date and calendars
 */
export async function getSpecialDayName(
    date: Date,
    calendarIds: number[],
): Promise<string> {
    const fromToDate = date.toLocaleDateString("en-ca");

    for (const calendarId of calendarIds) {
        const response = await churchtoolsClient.get<
            AppointmentCalculatedWithIncludes[]
        >(
            `/calendars/${calendarId}/appointments?from=${fromToDate}&to=${fromToDate}`,
        );

        console.log(response);
        if (response.length > 0) {
            const title = response[0].appointment.base.title;
            return title;
        }
    }

    return "";
}
