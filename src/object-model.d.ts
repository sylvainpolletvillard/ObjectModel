import { FromDefinition, FromObjectModelDefinition, ModelDefinition, ObjectModelDefinition } from '../types/definitions';
import { MergeObjects, TupleToUnion } from '../types/helpers';

export type Assertion = (variable: any) => boolean

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

	defaultTo<Default>(defaultValue: Default): ModelWithDefault<D,Default>;

	test(value: any, errorCollector?: (errors: ModelError[]) => void): boolean;

	errorCollector(errors: ModelError[]): void;

	assert(assertion: Assertion, description?: string | Function): this;

}

export interface ModelWithDefault<D,Default> extends Model<D> {
	default: Default

	(): Default
	new(): Default
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
}

export interface BasicModelConstructor {
	<D>(definition: D): BasicModel<D>
	new<D>(definition: D): BasicModel<D>;
}

export interface ObjectModel<D extends ObjectModelDefinition> extends Model<D> {
	(value: any): FromObjectModelDefinition<D>;
	new(value: any): FromObjectModelDefinition<D>;

	extend<Extensions extends (object | ObjectModel<any>)[]>(...ext: [...Extensions]) : MergeObjects<[this, ...Extensions]>;
}

export interface ObjectModelConstructor {
	<D extends ObjectModelDefinition>(definition: D): ObjectModel<D>;
	new<D extends ObjectModelDefinition>(definition: D): ObjectModel<D>;
}

export const Any: any;
export const Model: ModelConstructor;
export const BasicModel: BasicModelConstructor;
export const ObjectModel: ObjectModelConstructor;