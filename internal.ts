type JsonObject = {[Key in string]: JsonValue} & {[Key in string]?: JsonValue | undefined};

type JsonArray = JsonValue[] | readonly JsonValue[];

type JsonPrimitive = string | number | boolean | null;

type JsonValue = JsonPrimitive | JsonObject | JsonArray;

type Attribute = JsonValue;

export type Relationship = {
    links?: LinksObject | undefined;
    data: Linkage | Linkage[] | null;
    meta?: Meta;
} | {
    links?: LinksObject | undefined;
    data?: Linkage | Linkage[] | null;
    meta: Meta;
} | {
    links: LinksObject | undefined;
    data?: Linkage | Linkage[] | null;
    meta?: Meta;
};

interface LinkObject {
    href: string;
    meta?: Meta;
}

export interface LinksObject {
    self?: LinkObject | string | null;
    related?: LinkObject | string | null;
}

export interface ResourceObject {
    id: string;
    type: string;
    attributes?: {
        [key: string]: Attribute;
    } | undefined;
    relationships?: {
        [key: string]: Relationship;
    } | undefined;
    links?: LinksObject | undefined;
    meta?: Meta | undefined;
}

export interface Meta {
    [name: string]: unknown;
}

export interface Linkage {
    type: string;
    id: string;
    meta?: Meta;
}

export interface JsonApiObject {
    version: string;
}

export interface ErrorObject {
    id?: string | undefined;
    links?:
        | LinksObject & {
            about: LinkObject | string;
        }
        | undefined;
    status?: string | undefined;
    code?: string | undefined;
    title?: string | undefined;
    detail?: string | undefined;
    source?: unknown | undefined;
    meta?: Meta | undefined;
}

export interface JSONAPIDocument {
    jsonapi?: JsonApiObject | undefined;
    links?: LinksObject | undefined;
    data?: ResourceObject | Array<ResourceObject> | undefined;
    errors?: ErrorObject[] | undefined;
    meta?: Meta | undefined;
    included?: Array<ResourceObject> | undefined;
}

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
