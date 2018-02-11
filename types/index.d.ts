// TypeScript definition file for ObjectModel

export interface Model {
	(value?: any): any;

	definition: any;
	assertions: Assertion[];
	default: any;

	errorCollector(errors: ModelError[]);

	extend(...otherDefinitions: Array<any>): this;

	assert(assertion: Assertion, description?: string | Function): this;

	defaultTo(defaultValue: any): this;

	test(value: any): boolean;

	validate(instance: any, errorCollector?: (errors: ModelError[]) => void): void;

	conventionForConstant(variableName: string): boolean;

	conventionForPrivate(variableName: string): boolean;
}

export interface ModelConstructor {
	(definition: any, params?: ObjectModelParams): ObjectModel;
	new (definition: any, params?: ObjectModelParams): ObjectModel;
}

export interface BasicModel extends Model {
	(): any;
	new (): any;
	(value: any): any
	new (value: any): any
}

export interface BasicModelConstructor {
	(definition: any): BasicModel
	new (definition: any): BasicModel;
}

export interface ObjectModel extends Model {
	(): any;
	new (): any;
	(object: object): any;
	new (object: object): any;

	defaults(defaultValuesObject: object);

	sealed: boolean;
}

export interface ObjectModelConstructor {
	(definition: Object, params?: ObjectModelParams): ObjectModel;
	new (definition: Object, params?: ObjectModelParams): ObjectModel;
}

export interface ObjectModelParams {
	sealed?: boolean;
}

export interface ArrayModel extends Model {
	<T>(): Array<T>;
	new <T>(): Array<T>;
	<T>(array: Array<T>): Array<T>;
	new <T>(array: Array<T>): Array<T>;
}

export interface ArrayModelConstructor {
	(itemDefinition: any): ArrayModel;
	new (itemDefinition: any): ArrayModel;
}

export interface FunctionModel extends Model {
	(): Function;
	new (): Function;
	(fn: Function): Function;
	new (fn: Function): Function;

	definition: { arguments: any[], return: any };

	return(returnValueDefinition: any): FunctionModel;
}

export interface FunctionModelConstructor {
	(...argumentsDefinitions: any[]): FunctionModel;
	new (...argumentsDefinitions: any[]): FunctionModel;
}

export interface MapModel extends Model {
	(): Map<any,any>;
	new (): Map<any,any>;
	(iterable: Map<any,any> | Array<[any, any]>): Map<any,any>;
	new (iterable: Map<any,any> | Array<[any, any]>): Map<any,any>;
}

export interface MapModelConstructor {
	(keyDefinition: any, valueDefinition: any): MapModel;
	new (keyDefinition: any, valueDefinition: any): MapModel;
}

export interface SetModel extends Model {
	(): Set<any>;
	new (): Set<any>;
	(set: Set<any> | Array<any>): Set<any>;
	new (set: Set<any> | Array<any>): Set<any>;
}

export interface SetModelConstructor {
	(itemDefinition: any): SetModel;
	new (itemDefinition: any): SetModel;
}

export type Assertion = (variable: any) => boolean

export interface ModelError {
	message: string;
	expected: any;
	received: any;
	path: string;
}

export const Model: ModelConstructor;
export const BasicModel: BasicModelConstructor;
export const ObjectModel: ObjectModelConstructor;
export const ArrayModel: ArrayModelConstructor;
export const FunctionModel: FunctionModelConstructor;
export const MapModel: MapModelConstructor;
export const SetModel: SetModelConstructor;
