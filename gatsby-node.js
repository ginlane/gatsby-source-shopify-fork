"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

exports.__esModule = true;
exports.sourceNodes = void 0;

var _fp = require("lodash/fp");

var _chalk = _interopRequireDefault(require("chalk"));

var _pIteration = require("p-iteration");

var _lib = require("./lib");

var _nodes = require("./nodes");

var _queries = require("./queries");

const sourceNodes = async ({
  actions: {
    createNode,
    touchNode
  },
  createNodeId,
  store,
  cache,
  reporter
}, {
  shopName,
  accessToken,
  verbose = true,
  paginationSize = 250
}) => {
  const client = (0, _lib.createClient)(shopName, accessToken); // Convenience function to namespace console messages.

  const formatMsg = msg => _chalk.default`\n{blue gatsby-source-shopify/${shopName}} ${msg}`;

  try {
    console.log(formatMsg(`starting to fetch data from Shopify`)); // Arguments used for file node creation.

    const imageArgs = {
      createNode,
      createNodeId,
      touchNode,
      store,
      cache,
      reporter // Arguments used for node creation.

    };
    const args = {
      client,
      createNode,
      createNodeId,
      formatMsg,
      verbose,
      imageArgs,
      paginationSize // Message printed when fetching is complete.

    };
    const msg = formatMsg(`finished fetching data from Shopify`);
    console.time(msg);
    await Promise.all([createNodes(`articles`, _queries.ARTICLES_QUERY, _nodes.ArticleNode, args, async x => {
      if (x.comments) await (0, _pIteration.forEach)(x.comments.edges, async edge => createNode((await (0, _nodes.CommentNode)(imageArgs)(edge.node))));
    }), createNodes(`blogs`, _queries.BLOGS_QUERY, _nodes.BlogNode, args), createNodes(`collections`, _queries.COLLECTIONS_QUERY, _nodes.CollectionNode, args), createPageNodes(`pages`, _queries.PAGES_QUERY, _nodes.PageNode, args), createNodes(`products`, _queries.PRODUCTS_QUERY, _nodes.ProductNode, args, async x => {
      if (x.variants) await (0, _pIteration.forEach)(x.variants.edges, async edge => createNode((await (0, _nodes.ProductVariantNode)(imageArgs)(edge.node))));
      if (x.metafields) await (0, _pIteration.forEach)(x.metafields.edges, async edge => createNode((await (0, _nodes.ProductMetafieldNode)(imageArgs)(edge.node))));
      if (x.options) await (0, _pIteration.forEach)(x.options, async option => createNode((await (0, _nodes.ProductOptionNode)(imageArgs)(option))));
    }), createShopPolicies(args)]);
    console.timeEnd(msg);
  } catch (e) {
    console.error(_chalk.default`\n{red error} an error occurred while sourcing data`); // If not a GraphQL request error, let Gatsby print the error.

    if (!e.hasOwnProperty(`request`)) throw e;
    (0, _lib.printGraphQLError)(e);
  }
};
/**
 * Fetch and create nodes for the provided endpoint, query, and node factory.
 */


exports.sourceNodes = sourceNodes;

const createNodes = async (endpoint, query, nodeFactory, {
  client,
  createNode,
  formatMsg,
  verbose,
  imageArgs,
  paginationSize
}, f = async () => {}) => {
  // Message printed when fetching is complete.
  const msg = formatMsg(`fetched and processed ${endpoint}`);
  if (verbose) console.time(msg);
  await (0, _pIteration.forEach)((await (0, _lib.queryAll)(client, [`shop`, endpoint], query, paginationSize)), async entity => {
    const node = await nodeFactory(imageArgs)(entity);
    createNode(node);
    await f(entity);
  });
  if (verbose) console.timeEnd(msg);
};
/**
 * Fetch and create nodes for shop policies.
 */


const createShopPolicies = async ({
  client,
  createNode,
  formatMsg,
  verbose
}) => {
  // Message printed when fetching is complete.
  const msg = formatMsg(`fetched and processed policies`);
  if (verbose) console.time(msg);
  const {
    shop: policies
  } = await (0, _lib.queryOnce)(client, _queries.SHOP_POLICIES_QUERY);
  Object.entries(policies).filter(([_, policy]) => Boolean(policy)).forEach((0, _fp.pipe)(([type, policy]) => (0, _nodes.ShopPolicyNode)(policy, {
    type
  }), createNode));
  if (verbose) console.timeEnd(msg);
};

const createPageNodes = async (endpoint, query, nodeFactory, {
  client,
  createNode,
  formatMsg,
  verbose,
  paginationSize
}, f = async () => {}) => {
  // Message printed when fetching is complete.
  const msg = formatMsg(`fetched and processed ${endpoint}`);
  if (verbose) console.time(msg);
  await (0, _pIteration.forEach)((await (0, _lib.queryAll)(client, [endpoint], query, paginationSize)), async entity => {
    const node = await nodeFactory(entity);
    createNode(node);
    await f(entity);
  });
  if (verbose) console.timeEnd(msg);
};