import { MapModel, Model } from "objectmodel";

const Course = Model(["math", "english", "history"]);
const Grade = Model(["A", "B", "C"]);

const Gradebook = MapModel(Course, Grade);

const joannaGrades = new Gradebook([["math", "B"], ["english", "C"]]);

joannaGrades.set("videogames", "A");
// TypeError: expecting Map key to be "math" or "english" or "history", got String "videogames"

joannaGrades.set("history", "nope");
// TypeError: expecting Map["history"] to be "A" or "B" or "C", got String "nope"
