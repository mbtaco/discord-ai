// Simple in-memory chat history
const sessions = {};

function getSession(key) {
  if (!sessions[key]) {
    sessions[key] = [];
  }
  return sessions[key];
}

function clearSession(key) {
  sessions[key] = [];
}

module.exports = { getSession, clearSession };