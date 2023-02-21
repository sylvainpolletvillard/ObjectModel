import { ExtendObjectDefinition, FromDefinition, FromObjectModelDefinition, ModelDefinition, ObjectModelDefinition } from '../types/definitions';

export type Assertion = (variable: unknown) => boolean

export interface ModelError {
	message: string;
	expected: any;
	received: any;
	path: string;
}

export interface Model<D> {	
	definition: D;
	assertions: Assertion[];
	name: string;

	conventionForConstant(variableName: string): boolean;
	conventionForPrivate(variableName: string): boolean;

	toString(stack?: any[]): string;

	as(name: string): this;

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
	(value: FromDefinition<D>): FromDefinition<D>
	new(value: FromDefinition<D>): FromDefinition<D>
	
	extend<E extends ModelDefinition[]>(...extensions: E): BasicModel<E extends [] ? D : [D, ...E]>;
	defaultTo<Default extends FromDefinition<D>>(defaultValue: Default): BasicModelWithDefault<D, Default>;
}

export interface BasicModelWithDefault<D, Default> extends BasicModel<D> {
	(): Default
	new(): Default
}

export interface BasicModelConstructor {
	<D>(definition: D): BasicModel<D>
	new<D>(definition: D): BasicModel<D>;
}

export interface ObjectModel<D extends ObjectModelDefinition> extends Model<D> {
	(value: Partial<FromObjectModelDefinition<D>>): FromObjectModelDefinition<D>;
	new(value: Partial<FromObjectModelDefinition<D>>): FromObjectModelDefinition<D>;

	extend<Extensions extends (ObjectModelDefinition | ObjectModel<any>)[]>(...ext: Extensions) : ObjectModel<ExtendObjectDefinition<D, Extensions>>;
	defaultTo<Default extends Partial<FromObjectModelDefinition<D>>>(defaultValue: Default): ObjectModelWithDefault<D, Default>
}

export interface ObjectModelWithDefault<D extends ObjectModelDefinition, Default> extends ObjectModel<D> {
	(): Default
	new(): Default
}

export interface ObjectModelConstructor {
	<D extends ObjectModelDefinition>(definition: D): ObjectModel<D>;
	new<D extends ObjectModelDefinition>(definition: D): ObjectModel<D>;
}

export const Any: any;
export const Model: ModelConstructor;
export const BasicModel: BasicModelConstructor;
export const ObjectModel: ObjectModelConstructor;