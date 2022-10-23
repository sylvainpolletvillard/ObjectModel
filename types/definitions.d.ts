import { ArrayModel } from "../src/array-model"

export type ModelDefinition = any
export type ObjectModelDefinition = Record<string | number | symbol, unknown>
export type FunctionModelDefinition = any

export type FromDefinition<T> = T extends StringConstructor | RegExp ? string
                              : T extends NumberConstructor ? number
                              : T extends BooleanConstructor ? boolean
                              : T extends ObjectModelDefinition ? FromObjectModelDefinition<T>
                              : T extends ArrayModel<infer U> ? Array<FromDefinition<U>>
                              : T extends readonly [...infer U] ? FromUnionDefinition<U>
                              : T extends any[] ? FromDefinition<T[number]> // TypeScript can't infer array literals as tuples for now without <const> assertions, see https://github.com/microsoft/TypeScript/issues/16656
                              : T extends new () => infer ConstructorType ? ConstructorType
					          : T

export type FromObjectModelDefinition<D extends object> = { [K in keyof D]: FromDefinition<D[K]> }

export type FromUnionDefinition<T extends any[]> = T extends [infer X] ? Optional<X>
                                                 : FromDefinition<T[number]>

export type Optional<T> = FromDefinition<T> | undefined | null