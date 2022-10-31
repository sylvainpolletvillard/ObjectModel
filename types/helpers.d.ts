export type Class = abstract new (...args: any) => any

/* Used to depth-limit recursive types */
export type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];