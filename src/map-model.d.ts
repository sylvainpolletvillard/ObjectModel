import { FromDefinition, ModelDefinition } from "../types/definitions";
import { Model } from "./object-model";

export interface MapModel<Key extends ModelDefinition, Value extends ModelDefinition> extends Model<{ key: Key, value: Value}> {
	(): Map<FromDefinition<Key>, FromDefinition<Value>>;
	new(): Map<FromDefinition<Key>, FromDefinition<Value>>;
	(iterable: Map<any, any> | [any, any][]): Map<FromDefinition<Key>, FromDefinition<Value>>;
	new(iterable: Map<any, any> | [any, any][]): Map<FromDefinition<Key>, FromDefinition<Value>>;

	definition: { key: Key, value: Value };
	
	extend<Keys extends ModelDefinition[], Values extends ModelDefinition[]>(otherKeys: Keys, otherValues: Values): MapModel<[Key, ...Keys], [Value, ...Values]>
}

export interface MapModelConstructor {
	<Key extends ModelDefinition, Value extends ModelDefinition>(keyDefinition: Key, valueDefinition: Value): MapModel<Key, Value>;
	new<Key extends ModelDefinition, Value extends ModelDefinition>(keyDefinition: Key, valueDefinition: Value): MapModel<Key, Value>;
}

export const MapModel: MapModelConstructor;