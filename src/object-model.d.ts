import { FromDefinition, FromObjectModelDefinition, ModelDefinition, ObjectModelDefinition } from '../types/definitions';
import { Assertion, ModelError } from "../types";

export interface Model<D> {
	(value?: any): any;

	definition: D;
	assertions: Assertion[];
	default?: FromDefinition<D>;
	name: string;

	conventionForConstant(variableName: string): boolean;
	conventionForPrivate(variableName: string): boolean;

	toString(stack?: any[]): string;

	as(name: string): this;

	defaultTo(defaultValue: FromDefinition<D>): this;

	test(value: any, errorCollector?: (errors: ModelError[]) => void): boolean;

	errorCollector(errors: ModelError[]): void;

	assert(assertion: Assertion, description?: string | Function): this;

}

export interface ModelConstructor {
	<D>(definition: D): D extends ObjectModelDefinition ? ObjectModel<D> : BasicModel<D>;
	new<D>(definition: D): D extends ObjectModelDefinition ? ObjectModel<D> : BasicModel<D>;
	CHECK_ONCE: symbol;
}

export interface BasicModel<D> extends Model<D> {
	(): FromDefinition<D>
	new(): FromDefinition<D>
	(value: any): FromDefinition<D>
	new(value: any): FromDefinition<D>

	extend(...otherDefinitions: ModelDefinition[]): this;
}

export interface BasicModelConstructor {
	<D>(definition: D): BasicModel<D>
	new<D>(definition: D): BasicModel<D>;
}

export interface ObjectModel<D extends ObjectModelDefinition> extends Model<D> {
	(): FromObjectModelDefinition<D>
	new(): FromObjectModelDefinition<D>
	(definition: D): FromObjectModelDefinition<D>;
	new(definition: D): FromObjectModelDefinition<D>;

	extend(...otherDefinitions: (object | ObjectModel<any>)[]): this;
}

export interface ObjectModelConstructor {
	<D extends ObjectModelDefinition>(definition: D): ObjectModel<D>;
	new<D extends ObjectModelDefinition>(definition: D): ObjectModel<D>;
}

export const Any: any;
export const Model: ModelConstructor;
export const BasicModel: BasicModelConstructor;
export const ObjectModel: ObjectModelConstructor;