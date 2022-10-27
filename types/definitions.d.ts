import { ArrayModel } from "../src/array-model"
import { FunctionModel, FunctionSignature } from "../src/function-model"
import { MapModel } from "../src/map-model"
import { SetModel } from "../src/set-model"
import { BasicModel, ObjectModel } from "../src/object-model"
import { Class, Prev } from "./helpers"


export type ModelDefinition = any
export type ObjectModelDefinition = Record<string | number | symbol, unknown>

export type FromDefinition<T, Depth extends Prev[number] = 5> =
    [Depth] extends [never] ? never /* Depth limit reached */
    : T extends BasicModel<infer U> ? FromDefinition<U, Prev[Depth]>
    : T extends ArrayModel<infer U> ? FromDefinition<U, Prev[Depth]>[]
    : T extends ObjectModel<infer D> ? FromObjectModelDefinition<D>
    : T extends FunctionModel<infer Args, infer Return> ? FunctionSignature<Args, Return>
    : T extends MapModel<infer Key, infer Value> ? Map<FromDefinition<Key, Prev[Depth]>, FromDefinition<Value, Prev[Depth]>>
    : T extends SetModel<infer U> ? Set<FromDefinition<U, Prev[Depth]>>
    : T extends StringConstructor | RegExp ? string
    : T extends NumberConstructor ? number
    : T extends BooleanConstructor ? boolean
    : T extends new () => infer ConstructorType ? ConstructorType
    : T extends Class ? InstanceType<T>
    : T extends ObjectModelDefinition ? FromObjectModelDefinition<T>
    : T extends readonly [...infer U] ? FromUnionDefinition<U>
    : T extends any[] ? FromDefinition<T[number], Prev[Depth]> // TypeScript can't infer array literals as tuples for now without <const> assertions, see https://github.com/microsoft/TypeScript/issues/16656
    : T

export type FromObjectModelDefinition<D extends object> = { [K in keyof D]: FromDefinition<D[K]> }

export type FromUnionDefinition<T extends any[]> = T extends [infer X] ? Optional<X>
                                                 : FromDefinition<T[number]>

export type Optional<T> = FromDefinition<T> | undefined | null

export type ExtendObjectDefinition<D extends ObjectModelDefinition, E extends (ObjectModelDefinition | ObjectModel<any>)[]> = 
    E extends [infer F, ...infer Rest extends (ObjectModelDefinition | ObjectModel<any>)[]] 
        ? F extends ObjectModel<infer FD> 
            ? ExtendObjectDefinition<D & FD, Rest>
            : F extends ObjectModelDefinition ? ExtendObjectDefinition<D & FromObjectModelDefinition<F>, Rest> 
            : never
        : D

type T = ExtendObjectDefinition<{ name: string, female: boolean }, [ { test: NumberConstructor }, { female: true }]> 