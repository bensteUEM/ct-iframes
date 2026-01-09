/*
These functions can be used to generate additional information about events using their services
*/

import { churchtoolsClient } from "@churchtools/churchtools-client";
import type {
    Person,
    Event,
    PersonMasterData,
    DomainObjectPerson,
    GroupMember,
    Group,
} from "./utils/ct-types";

/**
 *  Helper function which retrieves a text representation of an event service including the persons title based on considered groups.

    1. Lookup relevant services e.g. "Predigt"
    2. Lookup the prefix of the person to be used based on group assignemnts e.g. "Pfarrer"

* @param eventId: number of the event id for the respective calendar appointment
* @param consideredProgramServices: list of services which should be considered
* @param consideredProgramTitleGroups : groups which should be used as prefix if applicable

 * @returns formatted useable string with title and name
 */
export async function getTitleNameServices(
    eventId: number,
    consideredProgramServices: number[],
    consideredProgramTitleGroups: number[],
): Promise<string> {
    let relevantPersons: DomainObjectPerson[] = [];

    for (const serviceId of consideredProgramServices) {
        const persons = await getPersonsWithService(eventId, serviceId);
        relevantPersons = relevantPersons.concat(persons);
    }

    const namesWithTitle: string[] = [];

    for (const person of relevantPersons) {
        let titlePrefix = await getGroupTitleOfPerson(
            person,
            consideredProgramTitleGroups,
        );

        titlePrefix = await getGenderedGroupName(person, titlePrefix);

        let formattedName: string;

        if (person.domainIdentifier) {
            const lastName = person.domainAttributes.lastName;
            formattedName = `${titlePrefix} ${lastName}`.trim();
        } else {
            formattedName = "Noch unbekannt";
        }

        namesWithTitle.push(formattedName);
    }
    const result = namesWithTitle.join(", ");
    console.log(`Final formatted names with titles: ${result}`);

    return result
}

/**
 * Helper function which retrieves all persons assigned to a specific service within an event
 * @param eventId
 * @param serviceId
 */
export async function getPersonsWithService(
    eventId: number,
    serviceId: number,
): Promise<DomainObjectPerson[]> {
    const relevantEvent = await churchtoolsClient.get<Event>(
        `/events/${eventId}?include=EventServices`,
    );

    if (!relevantEvent.eventServices) {
        console.log("Event has no services assigned");
        return [];
    }

    console.log(
        `Found ${relevantEvent.eventServices.length} services for event ${eventId}`,
    );

    const result = relevantEvent.eventServices
        .filter((s) => s.serviceId === serviceId && s.person)
        .map((s) => s.person!);

    console.log(
        `Found ${result.length} persons for service ${serviceId} in event ${eventId}`,
    );

    return result;
}

/**
 * Retrieve name of first group for specified person and gender if possible.
 * @param person base reference to person
 * @param relevantGroups the CT id of any groups to be considered as title
* Permissions:
        view person
        view alldata (Persons)
        view group
 * @returns Prefix which is used as title incl. gendered version
 */
export async function getGroupTitleOfPerson(
    person: DomainObjectPerson,
    relevantGroups: number[],
): Promise<string> {
    for (const groupId of relevantGroups) {
        const members = await churchtoolsClient.get<GroupMember[]>(
            `/groups/${groupId}/members?person_id[]=${person.domainIdentifier}`,
        );

        if (members.length === 0) {
            continue;
        }
        const result = (
            await churchtoolsClient.get<Group>(`/groups/${groupId}`)
        ).name;
        console.log(
            `Found relevant group title "${result}" for person ${person.domainIdentifier}`,
        );
        return result;
    }
    console.log(
        `No relevant group title found for person ${person.domainIdentifier}`,
    );
    return "";
}

/**
 * Add german gender (female) specific extension to group name based on persons gender.
 * @param person base reference to person
 * @param groupName the name of the group which should get a suffix
 * @returns combination of groupname and applicable gender - e.g. "Pfarrer" -> "Pfarrerin"
 */
export async function getGenderedGroupName(
    person: DomainObjectPerson,
    groupName: string,
): Promise<string> {
    /* Gender specific adjustment */

    const personDetail = await churchtoolsClient.get<Person>(
        `/persons/${person.domainIdentifier}`,
    );

    const masterdata =
        await churchtoolsClient.get<PersonMasterData>("/person/masterdata");
    if (!masterdata.sexes) {
        console.warn("No gender masterdata accessible");
        return groupName;
    }

    const genderMap = masterdata.sexes.reduce(
        (map, obj) => {
            map[obj.id] = obj.name;
            return map;
        },
        {} as Record<number, string>,
    );

    let sexId = personDetail.sexId ?? 0;

    if (genderMap[sexId] === "sex.female" && groupName.length > 0) {
        const parts = groupName.split(" ");
        const firstGendered = parts[0] + "in";
        groupName = [firstGendered, ...parts.slice(1)].join(" ");
    }

    console.log(`Gendered group name as: ${groupName}`);
    return groupName;
}
