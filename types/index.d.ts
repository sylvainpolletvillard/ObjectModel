// TypeScript definition file for ObjectModel

import { ModelConstructor, BasicModelConstructor, ObjectModelConstructor } from "../src/object-model";
import { ModelDefinition, FromDefinition } from "./definitions";

export interface ArrayModel<D extends ModelDefinition> extends Model<D> {	
	(array: FromDefinition<D>[]): FromDefinition<D>[];
	new(array: FromDefinition<D>[]): FromDefinition<D>[];

	extend(...otherElementDefinitions: any[]): this;
}

export interface ArrayModelConstructor {
	<D extends ModelDefinition>(itemDefinition: D): ArrayModel<D>;
	new<D extends ModelDefinition>(itemDefinition: D): ArrayModel<D>;
}

export interface FunctionModel<Args extends ModelDefinition[], Return extends ModelDefinition> extends Model<{ arguments: Args, return: Return }> {
	(): Function;
	new(): Function;
	(fn: Function): Function;
	new(fn: Function): Function;

	definition: { arguments: Args, return: Return };

	return<R extends ModelDefinition>(returnValueDefinition: any): FunctionModel<Args, R>;

	extend(otherArgsDefinitions: any[], otherReturnValuesDefinitions: any[]): this;
}

export interface FunctionModelConstructor {
	<Args extends ModelDefinition[]>(...argumentsDefinitions: any[]): FunctionModel<Args, any>;
	new<Args extends ModelDefinition[]>(...argumentsDefinitions: any[]): FunctionModel<Args, any>;
}

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

export interface SetModel<D extends ModelDefinition> extends Model<D> {
	(set: Set<any> | any[]): Set<any>;
	new(set: Set<any> | any[]): Set<any>;

	extend(...otherElementDefinitions: Array<any>): this;
}

export interface SetModelConstructor {
	<D extends ModelDefinition>(itemDefinition: D): SetModel<D>;
	new<D extends ModelDefinition>(itemDefinition: D): SetModel<D>;
}

export type Assertion = (variable: any) => boolean

export interface ModelError {
	message: string;
	expected: any;
	received: any;
	path: string;
}

export const Any: any;
export const Model: ModelConstructor;
export const BasicModel: BasicModelConstructor;
export const ObjectModel: ObjectModelConstructor;
export const ArrayModel: ArrayModelConstructor;
export const FunctionModel: FunctionModelConstructor;
export const MapModel: MapModelConstructor;
export const SetModel: SetModelConstructor;
