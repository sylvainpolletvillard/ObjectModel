type FromTypeDeclaration<T> = T extends StringConstructor ? string
                            : T extends NumberConstructor ? number
                            : T extends BooleanConstructor ? boolean
                            : T extends Record<string | number | symbol, unknown> ? FromDefinition<T>
                            : T

type FromDefinition<D extends object> = { [K in keyof D]: FromTypeDeclaration<D[K]> }

type T = FromDefinition<{ name: String, age: Number }>
 
interface OMConstructor {
	<D extends object>(definition: D): FromDefinition<D>;
}

const M: OMConstructor = function M<D extends object>(def: D){
    return Object.fromEntries(Object.entries(def)) as FromDefinition<D>
}

const m = M({
	product: {
		name: String,
		quantity: Number,
	},
	orderDate: Date
})

const n = m.product.quantity