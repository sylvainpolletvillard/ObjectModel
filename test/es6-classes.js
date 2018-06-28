function testSuiteClasses(Model) {

	QUnit.test("class constructors", function (assert) {

		var PersonModel = Model.Object({firstName: String, lastName: String, fullName: String});

		class Person extends PersonModel {
			constructor({firstName, lastName}) {
				const fullName = `${firstName} ${lastName}`
				super({firstName, lastName, fullName})
			}
		}

		var person = new Person({firstName: "John", lastName: "Smith"})
		assert.ok(person instanceof Person, "person instanceof Person")
		assert.ok(person instanceof PersonModel, "person instanceof PersonModel")
		assert.equal(person.fullName, "John Smith", "check es6 class constructor")

		var UserModel = Person.extend({role: String});

		class User extends UserModel {
			constructor({firstName, lastName, role}) {
				super({firstName, lastName, role})
				if (role === "admin") {
					this.fullName += " [ADMIN]"
				}
			}
		}

		var user = new User({firstName: "John", lastName: "Smith", role: "admin"})

		assert.ok(user instanceof User, "user instanceof User")
		assert.ok(user instanceof UserModel, "user instanceof UserModel")
		assert.ok(user instanceof Person, "user instanceof Person")
		assert.ok(user instanceof PersonModel, "user instanceof PersonModel")
		assert.equal(user.fullName, "John Smith [ADMIN]", "check es6 class constructor with extended class")
		assert.equal(Object.keys(User.definition).sort().join(","), "firstName,fullName,lastName,role", "check definition keys")
		assert.equal(Object.keys(user).sort().join(","), "firstName,fullName,lastName,role", "check instance keys")
		assert.throws(function () {
			user.role = null;
		}, /TypeError/, "extended class model check definition")

		var Lovers = class Lovers extends Model.Object({
			husband: Person,
			wife: Person,
		}) {
		};

		var joe = {firstName: 'Joe', lastName: "Smith"};
		var ann = new Person({firstName: "Ann", lastName: "Smith"});

		var couple = new Lovers({
			husband: joe, // object duck typed
			wife: ann, // object model
		});

		assert.ok(couple.husband instanceof Person, "duck tying works with class-based models");

		assert.equal(Person.test({firstName: 0, lastName: ""}), false, `test method with class-based models`);

		class Request extends Model.Object({id: [Number]}) {
			setId(id) {
				this.id = id;
			}
		}

		var x = new Request({});
		assert.throws(function () {
			x.setId("32")
		}, /TypeError/, "class setters methods should provide type checking");
	})

}