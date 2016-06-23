'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import type {Dispatcher} from 'flux';

import {
  Disposable,
  CompositeDisposable,
} from 'atom';
import {EventEmitter} from 'events';
import Constants from './Constants';

type CallstackItem = {
  name: string;
  location: {
    path: string;
    line: number;
    column?: number;
  };
};
export type Callstack = Array<CallstackItem>;

export default class CallstackStore {
  _disposables: IDisposable;
  _callstack: ?Callstack;
  _eventEmitter: EventEmitter;

  constructor(dispatcher: Dispatcher) {
    const dispatcherToken = dispatcher.register(this._handlePayload.bind(this));
    this._disposables = new CompositeDisposable(
      new Disposable(() => {
        dispatcher.unregister(dispatcherToken);
      })
    );
    this._callstack = null;
    this._eventEmitter = new EventEmitter();
  }

  _handlePayload(payload: Object) {
    switch (payload.actionType) {
      case Constants.Actions.UPDATE_CALLSTACK:
        this._updateCallstack(payload.data.callstack);
        break;
      default:
        return;
    }
  }

  _updateCallstack(callstack: Callstack): void {
    this._callstack = callstack;
    this._eventEmitter.emit('change');
  }

  onChange(callback: () => void): Disposable {
    const emitter = this._eventEmitter;
    this._eventEmitter.on('change', callback);
    return new Disposable(() => emitter.removeListener('change', callback));
  }

  getCallstack(): ?Callstack {
    return this._callstack;
  }

  dispose(): void {
    this._disposables.dispose();
  }
}
