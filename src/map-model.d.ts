import { ModelDefinition } from "../types/definitions";
import { Model } from "./object-model";

export interface MapModel<Key extends ModelDefinition, Value extends ModelDefinition> extends Model<{ key: Key, value: Value}> {
	(): Map<any, any>;
	new(): Map<any, any>;
	(iterable: Map<any, any> | Array<[any, any]>): Map<any, any>;
	new(iterable: Map<any, any> | Array<[any, any]>): Map<any, any>;

	definition: { key: Key, value: Value };

	extend(otherKeyDefinitions: any[], otherValueDefinitions: any[]): this;
}

export interface MapModelConstructor {
	<Key extends ModelDefinition, Value extends ModelDefinition>(keyDefinition: Key, valueDefinition: Value): MapModel<Key, Value>;
	new<Key extends ModelDefinition, Value extends ModelDefinition>(keyDefinition: Key, valueDefinition: Value): MapModel<Key, Value>;
}

export const MapModel: MapModelConstructor;