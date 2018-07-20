/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 * @emails oncall+nuclide
 */
import http from 'http';
import querystring from 'querystring';
import * as utils from '../lib/utils';
import asyncRequest from 'big-dig/src/client/utils/asyncRequest';
import waitsFor from '../../../jest/waits_for';

describe('NuclideServer utils test', () => {
  let server;
  let customHandler;

  beforeEach(async () => {
    let connected = false;
    server = http.createServer((req, res) => {
      if (customHandler) {
        customHandler(req, res);
      } else {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('okay');
      }
    });
    server.listen(36845, '127.0.0.1', 511 /* backlog */, () => {
      connected = true;
    });
    await waitsFor(() => connected);
  });

  afterEach(() => {
    server.close();
    customHandler = null;
  });

  it('parses the request body', async () => {
    const bodyHandler = jest.fn();
    customHandler = (req, res) => {
      utils
        // $FlowFixMe(asuarez): Use Flow builtin defs for IncomingMessage.
        .parseRequestBody(req)
        .then(bodyHandler)
        .then(() => res.end());
    };
    asyncRequest({
      uri: 'http://127.0.0.1:36845/abc',
      method: 'POST',
      body: 'string_abc',
    });
    await waitsFor(() => bodyHandler.mock.calls.length > 0);
    expect(bodyHandler.mock.calls[0][0]).toBe('string_abc');
  });

  it('gets query params', () => {
    const params = utils.getQueryParameters('http://fburil.com?one=2&yoga=def');
    expect(params).toEqual({one: '2', yoga: 'def'});
  });

  describe('serializeArgs', () => {
    it('serializes empty args', () => {
      const {args, argTypes} = utils.serializeArgs([]);
      expect(args).toEqual([]);
      expect(argTypes).toEqual([]);
    });

    it('serializes undefined args', () => {
      const {args, argTypes} = utils.serializeArgs(['abc', undefined]);
      expect(args).toEqual(['abc', '']);
      expect(argTypes).toEqual(['string', 'undefined']);
    });

    it('serializes object args', () => {
      const {args, argTypes} = utils.serializeArgs([{def: 'lol'}]);
      expect(args).toEqual([JSON.stringify({def: 'lol'})]);
      expect(argTypes).toEqual(['object']);
    });
  });

  describe('deserializeArgs', () => {
    it('deserializes strings and undefined', () => {
      const url =
        'http://localhost:8090/?args=abc&args=&argTypes=string&argTypes=undefined';
      const [str, undef] = utils.deserializeArgs(url);
      expect(str).toBe('abc');
      expect(undef).not.toBeDefined();
    });

    it('deserializes objects', () => {
      const escapedObj = querystring.escape(JSON.stringify({def: 'lol'}));
      const url =
        'http://localhost:8090/?args=' + escapedObj + '&argTypes=object';
      const [obj] = utils.deserializeArgs(url);
      expect(obj).toEqual({def: 'lol'});
    });
  });

  it('serializeArgs then deserializeArgs for strings with non-escaped chars', () => {
    const {args, argTypes} = utils.serializeArgs(['a d+']);
    const [str] = utils.deserializeArgs(
      'http://localhost:8090/?' + querystring.stringify({args, argTypes}),
    );
    expect(str).toBe('a d+');
  });
});
