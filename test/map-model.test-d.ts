import {expectType} from 'tsd';
import { ObjectModel } from '../src/object-model';
import { MapModel } from '../src/map-model';

expectType<Map<number, boolean>>(MapModel(Number, Boolean)(new Map([[1, true],[2, false]])));

const Question = ObjectModel({ q: String })
const Response = ObjectModel({ r: String })

const Quiz = MapModel(Question, Response);

expectType<Map<{ q: string }, { r: string }>>(Quiz(new Map([])));

const MapModel1 = MapModel(String, Date)
const MapModel2 = MapModel1.extend([ ObjectModel({ ref: String }), Number], [ ObjectModel({ date: Date }), String])

expectType<Map<string | number | { ref: string }, Date | string | { date: Date }>>(MapModel2([
    ["a", new Date()],
    [2, "b"],
    [{ ref: "c"}, { date: new Date() }]
]))