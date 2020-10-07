import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import '@blueprintjs/select/lib/css/blueprint-select.css';
import '@blueprintjs/table/lib/css/table.css';

import ApolloClient from 'apollo-client';
import {ApolloLink} from 'apollo-link';
import {WebSocketLink} from 'apollo-link-ws';
import * as React from 'react';
import {ApolloProvider} from 'react-apollo';
import * as ReactDOM from 'react-dom';
import {createGlobalStyle} from 'styled-components/macro';
import {SubscriptionClient} from 'subscriptions-transport-ws';

import {App} from 'src/App';
import {AppCache} from 'src/AppCache';
import {AppErrorLink} from 'src/AppError';
import {WEBSOCKET_URI} from 'src/DomUtils';
import {formatElapsedTime, patchCopyToRemoveZeroWidthUnderscores, debugLog} from 'src/Util';
import {WebsocketStatusProvider} from 'src/WebsocketStatus';

// The solid sidebar and other UI elements insert zero-width spaces so solid names
// break on underscores rather than arbitrary characters, but we need to remove these
// when you copy-paste so they don't get pasted into editors, etc.
patchCopyToRemoveZeroWidthUnderscores();

const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
  }

  html, body, #root {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex: 1 1;
  }

  #root {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  body {
    margin: 0;
    padding: 0;
    font-family: sans-serif;
  }
`;

const websocketClient = new SubscriptionClient(WEBSOCKET_URI, {
  reconnect: true,
  lazy: true,
});

const timeStartLink = new ApolloLink((operation, forward) => {
  operation.setContext({start: performance.now()});
  return forward(operation);
});

const logTimeLink = new ApolloLink((operation, forward) => {
  return forward(operation).map((data) => {
    const time = performance.now() - operation.getContext().start;
    debugLog(`${operation.operationName} took ${formatElapsedTime(time)}`);
    return data;
  });
});

const client = new ApolloClient({
  cache: AppCache,
  link: ApolloLink.from([
    logTimeLink,
    AppErrorLink(),
    timeStartLink,
    new WebSocketLink(websocketClient),
  ]),
});

ReactDOM.render(
  <WebsocketStatusProvider websocket={websocketClient}>
    <GlobalStyle />
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </WebsocketStatusProvider>,
  document.getElementById('root') as HTMLElement,
);
