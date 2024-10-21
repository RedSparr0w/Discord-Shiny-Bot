class Votes {
  constructor(client) {
    this.client = client;
  }

  #votes_verified = {};
  #votes_denied = {};
  #dispute_reported = {}

  // Check if a user has voted on a specific messageID
  hasVoted = (messageID, userID) => {
      return this.#votes_verified[messageID]?.has(userID) || this.#votes_denied[messageID]?.has(userID);
  }
  hasDispute = (messageID) => {
      return this.#votes_verified[messageID]?.size && this.#votes_denied[messageID]?.size;
  }
  // Get/add votes for a specific messageID
  verified = (messageID) => {
      return this.#votes_verified[messageID] = this.#votes_verified[messageID] ?? new Set();
  };
  denied = (messageID) => {
      return this.#votes_denied[messageID] = this.#votes_denied[messageID] ?? new Set();
  };
  // Clear the votes for a specific messageID
  delete = (messageID) => {
      return delete this.#votes_verified[messageID] && delete this.#votes_denied[messageID];
  };
};

module.exports = Votes;
