/**
 * Manual mock for src/models/index.js
 *
 * Jest replaces the real module with this when a test calls
 * jest.mock('../../src/models').  Each exported model is a plain
 * object whose Mongoose static methods are Jest mock functions.
 * No mongoose connection is required — no real DB calls happen.
 */

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
