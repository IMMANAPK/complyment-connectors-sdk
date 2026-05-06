'use strict'
const { EventEmitter } = require('events')

/**
 * Async pub/sub message bus with topic-based routing.
 * Supports: publish, subscribe, request/reply, wildcard listener.
 * One bus per pipeline run — isolated between concurrent runs.
 */
class MessageBus extends EventEmitter {
  constructor(runId) {
    super()
    this.runId = runId
    this.setMaxListeners(100)
    this._history = new Map() // topic → envelope[]
  }

  publish(topic, message) {
    const envelope = { topic, message, runId: this.runId, ts: Date.now() }
    if (!this._history.has(topic)) this._history.set(topic, [])
    const hist = this._history.get(topic)
    hist.push(envelope)
    if (hist.length > 200) hist.shift()
    this.emit(topic, envelope)
    this.emit('*', envelope)
  }

  subscribe(topic, handler) {
    this.on(topic, ({ message }) => handler(message, topic))
    return () => this.removeListener(topic, handler)
  }

  // Request/reply — publisher expects one response on replyTopic
  async request(topic, message, timeoutMs = 15000) {
    const replyTopic = `${topic}:reply:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`MessageBus timeout: ${topic}`)), timeoutMs)
      this.once(replyTopic, ({ message: reply }) => { clearTimeout(timer); resolve(reply) })
      this.publish(topic, { ...message, replyTopic })
    })
  }

  reply(replyTopic, result) {
    this.publish(replyTopic, result)
  }

  getHistory(topic, limit = 20) {
    return (this._history.get(topic) || []).slice(-limit).map(e => e.message)
  }

  destroy() {
    this.removeAllListeners()
    this._history.clear()
  }
}

const _buses = new Map()

function getBus(runId) {
  if (!_buses.has(runId)) _buses.set(runId, new MessageBus(runId))
  return _buses.get(runId)
}

function releaseBus(runId) {
  const bus = _buses.get(runId)
  if (bus) { bus.destroy(); _buses.delete(runId) }
}

module.exports = { MessageBus, getBus, releaseBus }
