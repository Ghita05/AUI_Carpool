// Jest manual mock for src/models/index.js.
// Each exported model has mock functions for all Mongoose statics — no DB connection needed.

function makeModel() {
  const findOneMock = jest.fn();

  return {
    findOne: findOneMock,
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    countDocuments: jest.fn(),
  };
}

module.exports = {
  Ride:         makeModel(),
  User:         makeModel(),
  Vehicle:      makeModel(),
  Review:       makeModel(),
  Notification: makeModel(),
  Message:      makeModel(),
  Route:        makeModel(),
  Report:       makeModel(),
};
