export type ModelDefinition = any
export type ObjectModelDefinition = Record<string | number | symbol, unknown>
export type FunctionModelDefinition = any

export type FromDefinition<T> = T extends StringConstructor ? string
                              : T extends NumberConstructor ? number
                              : T extends BooleanConstructor ? boolean
                              : T extends ObjectModelDefinition ? FromObjectModelDefinition<T>
                              : T extends any[] ? FromUnionDefinition<T>
					          : T extends RegExp ? string
					          : T

export type FromObjectModelDefinition<D extends object> = { [K in keyof D]: FromDefinition<D[K]> }

export type FromUnionDefinition<T extends any[]> = T extends [infer X] ? Optional<X>
                                                 : T[number]

export type Optional<T> = FromDefinition<T> | undefined | null