/**
 * Functions to interact with ChurchTools resources.
 */

import { churchtoolsClient } from "@churchtools/churchtools-client";
import type {
    BookingCalculatedWithIncludes,
    ResourceMasterData,
} from "./utils/ct-types";

/**
 * Retrieve a list of resource names booked with a specific appointment on a given date.
 * @param appointmentTitle calendar appointment title
 * @param relevantDate date to check for bookings - because of recurring appointments
 * @param consideredResourceIds list of resource IDs to consider
 * @returns list of resource names found booked with the appointment on the given date
 */
export async function getResourceNames(
    appointmentTitle: string,
    relevantDate: Date,
    consideredResourceIds: number[],
): Promise<string[]> {
    const validResourceIds = consideredResourceIds.filter((id) => id > 0);

    const stringDate = relevantDate.toLocaleDateString("en-CA"); // YYYY-MM-DD
    const fromToParam = `&from_=${stringDate}&to_=${stringDate}`;
    const resourceIdsParam = validResourceIds
        .map((id) => `resource_ids[]=${id}`)
        .join("&");

    const bookings = await churchtoolsClient.get<
        BookingCalculatedWithIncludes[]
    >(`/bookings?query=${appointmentTitle}${fromToParam}${resourceIdsParam}`);

    console.log(
        `Bookings for appointment=${appointmentTitle} on ${fromToParam} fetched:`,
        bookings,
    );

    const resourceIds = bookings.map((b) => b.booking.base.resourceId);

    const resourcesMaster = await churchtoolsClient.get<ResourceMasterData>(
        "/resource/masterdata",
    );
    if (!resourcesMaster || !resourcesMaster.resources) {
        throw new Error("Failed to fetch resource master data");
    }
    const resources = resourcesMaster.resources
        .filter((r) => resourceIds.includes(r.id))
        .map((r) => r.nameTranslated);
    console.log("Resources fetched:", resources);

    return resources;
}
