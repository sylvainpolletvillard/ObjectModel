// TypeScript definition file for ObjectModel

export interface Model {
	(value?: any): any;

	definition: any;
	assertions: Assertion[];
	default: any;
	name: string;

	conventionForConstant(variableName: string): boolean;
	conventionForPrivate(variableName: string): boolean;

	toString(stack?: any[]): string;

	as(name: string): this;

	defaultTo(defaultValue: any): this;

	test(value: any, errorCollector?: (errors: ModelError[]) => void): boolean;

	errorCollector(errors: ModelError[]): void;

	assert(assertion: Assertion, description?: string | Function): this;

}

export interface ModelConstructor {
	(definition: any): ObjectModel;
	new(definition: any): ObjectModel;
}

export interface BasicModel extends Model {
	(): any;
	new(): any;
	(value: any): any
	new(value: any): any

	extend(...otherDefinitions: Array<any>): this;
}

export interface BasicModelConstructor {
	(definition: any): BasicModel
	new(definition: any): BasicModel;
}

export interface ObjectModel extends Model {
	(): Object;
	new(): Object;
	(object: object): Object;
	new(object: object): Object;

	extend(...otherDefinitions: Array<Object | ObjectModel>): this;
}

export interface ObjectModelConstructor {
	(definition: Object): ObjectModel;
	new(definition: Object): ObjectModel;
}

export interface ArrayModel extends Model {
	<T>(): Array<T>;
	new <T>(): Array<T>;
	<T>(array: Array<T>): Array<T>;
	new <T>(array: Array<T>): Array<T>;

	extend(...otherElementDefinitions: Array<any>): this;
}

export interface ArrayModelConstructor {
	(itemDefinition: any): ArrayModel;
	new(itemDefinition: any): ArrayModel;
}

export interface FunctionModel extends Model {
	(): Function;
	new(): Function;
	(fn: Function): Function;
	new(fn: Function): Function;

	definition: { arguments: any[], return: any };

	return(returnValueDefinition: any): FunctionModel;

	extend(otherArgsDefinitions: Array<any>, otherReturnValuesDefinitions: Array<any>): this;
}

export interface FunctionModelConstructor {
	(...argumentsDefinitions: any[]): FunctionModel;
	new(...argumentsDefinitions: any[]): FunctionModel;
}

export interface MapModel extends Model {
	(): Map<any, any>;
	new(): Map<any, any>;
	(iterable: Map<any, any> | Array<[any, any]>): Map<any, any>;
	new(iterable: Map<any, any> | Array<[any, any]>): Map<any, any>;

	extend(otherKeyDefinitions: Array<any>, otherValueDefinitions: Array<any>): this;
}

export interface MapModelConstructor {
	(keyDefinition: any, valueDefinition: any): MapModel;
	new(keyDefinition: any, valueDefinition: any): MapModel;
}

export interface SetModel extends Model {
	(): Set<any>;
	new(): Set<any>;
	(set: Set<any> | Array<any>): Set<any>;
	new(set: Set<any> | Array<any>): Set<any>;

	extend(...otherElementDefinitions: Array<any>): this;
}

export interface SetModelConstructor {
	(itemDefinition: any): SetModel;
	new(itemDefinition: any): SetModel;
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
