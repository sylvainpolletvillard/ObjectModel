import { ExtendObjectDefinition, FromDefinition, FromObjectModelDefinition, ModelDefinition, ObjectModelDefinition } from '../types/definitions';

export type Assertion<T> = (variable: T) => boolean

export interface ModelError<D> {
	model: Model<D>
	message: string;
	expected: any;
	received: any;
	path: string;
}

export interface Model<D> {	
	definition: D;
	assertions: Assertion<this>[];
	name: string;

	conventionForConstant(variableName: string): boolean;
	conventionForPrivate(variableName: string): boolean;

	toString(stack?: any[]): string;

	as(name: string): this;

	test(value: any, errorCollector?: (errors: ModelError<D>[]) => void): boolean;

	errorCollector(errors: ModelError<D>[]): void;

	assert(assertion: Assertion<this>, description?: string | Function): this;

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
	defaultTo<Default extends Partial<FromObjectModelDefinition<D>>>(defaultValue: Default): ObjectModelWithDefault<D>
}

export interface ObjectModelWithDefault<D extends ObjectModelDefinition> extends ObjectModel<D> {
	(): FromObjectModelDefinition<D>
	new(): FromObjectModelDefinition<D>
}

export interface ObjectModelConstructor {
	<D extends ObjectModelDefinition>(definition: D): ObjectModel<D>;
	new<D extends ObjectModelDefinition>(definition: D): ObjectModel<D>;
}

export const Any: any;
export const Model: ModelConstructor;
export const BasicModel: BasicModelConstructor;
export const ObjectModel: ObjectModelConstructor;