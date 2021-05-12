// @flow strict-local

import {fromNodeId} from './types';
import EfficientGraph from './EfficientGraph';
import type {Edge, Node, NodeId} from './types';
import type {TraversalActions, GraphVisitor} from '@parcel/types';

import assert from 'assert';
import nullthrows from 'nullthrows';

export type NullEdgeType = 1;
export type GraphOpts<TNode, TEdgeType: number = 1> = {|
  nodes?: Map<NodeId, TNode>,
  edges?: AdjacencyListMap<TEdgeType | NullEdgeType>,
  rootNodeId?: ?NodeId,
  nextNodeId?: ?number,
|};

export const ALL_EDGE_TYPES = '@@all_edge_types';

export default class Graph<TNode: Node, TEdgeType: number = 1> {
  nodes: Map<NodeId, TNode>;
  inboundEdges: AdjacencyList<TEdgeType | NullEdgeType>;
  outboundEdges: AdjacencyList<TEdgeType | NullEdgeType>;
  adjacencyList: EfficientGraph<TEdgeType>;
  rootNodeId: ?NodeId;
  nextNodeId: number = 0;

  constructor(opts: ?GraphOpts<TNode, TEdgeType>) {
    this.nodes = opts?.nodes || new Map();
    this.setRootNodeId(opts?.rootNodeId);
    this.nextNodeId = opts?.nextNodeId ?? 0;

    let edges = opts?.edges;
    if (edges != null) {
      // this.inboundEdges = new AdjacencyList();
      // this.outboundEdges = new AdjacencyList(edges);
      this.adjacencyList = new EfficientGraph<TEdgeType>();
      for (let [from, edgeList] of edges) {
        for (let [type, toNodes] of edgeList) {
          for (let to of toNodes) {
            // this.inboundEdges.addEdge(to, from, type);
            this.adjacencyList.addEdge(to, from, type);
          }
        }
      }
    } else {
      // this.inboundEdges = new AdjacencyList();
      // this.outboundEdges = new AdjacencyList();
      this.adjacencyList = new EfficientGraph<TEdgeType>();
    }
  }

  setRootNodeId(id: ?NodeId) {
    this.rootNodeId = id;
  }

  static deserialize(
    opts: GraphOpts<TNode, TEdgeType>,
  ): Graph<TNode, TEdgeType> {
    return new this({
      nodes: opts.nodes,
      edges: opts.edges,
      rootNodeId: opts.rootNodeId,
      nextNodeId: opts.nextNodeId,
    });
  }

  serialize(): GraphOpts<TNode, TEdgeType> {
    return {
      nodes: this.nodes,
      edges: this.outboundEdges.getListMap(),
      rootNodeId: this.rootNodeId,
      nextNodeId: this.nextNodeId,
    };
  }

  // Returns a list of all edges in the graph. This can be large, so iterating
  // the complete list can be costly in large graphs. Used when merging graphs.
  getAllEdges(): Array<Edge<TEdgeType | NullEdgeType>> {
    // let edges = [];
    // for (let [from, edgeList] of this.outboundEdges.getListMap()) {
    //   for (let [type, toNodes] of edgeList) {
    //     for (let to of toNodes) {
    //       edges.push({from, to, type});
    //     }
    //   }
    // }
    // return edges;
    return [...this.adjacencyList.getAllEdges()];
  }

  addNode(node: TNode): NodeId {
    let id = this.adjacencyList.addNode();
    this.nodes.set(id, node);
    return id;
  }

  hasNode(id: NodeId): boolean {
    return this.nodes.has(id);
  }

  getNode(id: NodeId): ?TNode {
    return this.nodes.get(id);
  }

  addEdge(
    from: NodeId,
    to: NodeId,
    type: TEdgeType | NullEdgeType = 1,
  ): boolean {
    if (Number(type) === 0) {
      throw new Error(`Edge type "${type}" not allowed`);
    }

    if (!this.getNode(from)) {
      throw new Error(`"from" node '${fromNodeId(from)}' not found`);
    }

    if (!this.getNode(to)) {
      throw new Error(`"to" node '${fromNodeId(to)}' not found`);
    }

    // this.outboundEdges.addEdge(from, to, type);
    // this.inboundEdges.addEdge(to, from, type);
    return this.adjacencyList.addEdge(from, to, type);
  }

  hasEdge(
    from: NodeId,
    to: NodeId,
    type?: TEdgeType | NullEdgeType = 1,
  ): boolean {
    // return this.outboundEdges.hasEdge(from, to, type);
    return this.adjacencyList.hasEdge(from, to, type);
  }

  getNodeIdsConnectedTo(
    nodeId: NodeId,
    type: TEdgeType | NullEdgeType | Array<TEdgeType | NullEdgeType> = 1,
  ): Array<NodeId> {
    this._assertHasNodeId(nodeId);

    return [...this.adjacencyList.getNodesConnectedTo(nodeId, type)];
    // let inboundByType = this.inboundEdges.getEdgesByType(nodeId);
    // if (inboundByType == null) {
    //   return [];
    // }

    // let nodes;
    // if (type === ALL_EDGE_TYPES) {
    //   nodes = new Set();
    //   for (let [, typeNodes] of inboundByType) {
    //     for (let node of typeNodes) {
    //       nodes.add(node);
    //     }
    //   }
    // } else if (Array.isArray(type)) {
    //   nodes = new Set();
    //   for (let typeName of type) {
    //     for (let node of inboundByType.get(typeName)?.values() ?? []) {
    //       nodes.add(node);
    //     }
    //   }
    // } else {
    //   nodes = new Set(inboundByType.get(type)?.values() ?? []);
    // }

    // return [...nodes];
  }

  getNodeIdsConnectedFrom(
    nodeId: NodeId,
    type: TEdgeType | NullEdgeType | Array<TEdgeType | NullEdgeType> = 1,
  ): Array<NodeId> {
    this._assertHasNodeId(nodeId);

    return [...this.adjacencyList.getNodesConnectedFrom(nodeId, type)];
    // let outboundByType = this.outboundEdges.getEdgesByType(nodeId);
    // if (outboundByType == null) {
    //   return [];
    // }

    // let nodes;
    // if (type === ALL_EDGE_TYPES) {
    //   nodes = new Set();
    //   for (let [, typeNodes] of outboundByType) {
    //     for (let node of typeNodes) {
    //       nodes.add(node);
    //     }
    //   }
    // } else if (Array.isArray(type)) {
    //   nodes = new Set();
    //   for (let typeName of type) {
    //     for (let node of outboundByType.get(typeName)?.values() ?? []) {
    //       nodes.add(node);
    //     }
    //   }
    // } else {
    //   nodes = new Set(outboundByType.get(type)?.values() ?? []);
    // }

    // return [...nodes];
  }

  // Removes node and any edges coming from or to that node
  removeNode(nodeId: NodeId) {
    this._assertHasNodeId(nodeId);

    for (let from of [
      ...this.adjacencyList.getNodesConnectedTo(
        nodeId,
        // $FlowFixMe
        ALL_EDGE_TYPES,
      ),
    ]) {
      this.removeEdge(
        from,
        nodeId,
        // $FlowFixMe
        ALL_EDGE_TYPES /* any type */,
        // Do not allow orphans to be removed as this node could be one
        // and is already being removed.
        false /* removeOrphans */,
      );
    }

    for (let to of [
      ...this.adjacencyList.getNodesConnectedFrom(
        nodeId,
        // $FlowFixMe
        ALL_EDGE_TYPES,
      ),
    ]) {
      this.removeEdge(nodeId, to);
    }

    let wasRemoved = this.nodes.delete(nodeId);
    assert(wasRemoved);
  }

  removeEdges(nodeId: NodeId, type: TEdgeType | NullEdgeType = 1) {
    this._assertHasNodeId(nodeId);

    // for (let to of this.outboundEdges.getEdges(nodeId, type)) {
    //   this.removeEdge(nodeId, to, type);
    // }
    for (let to of this.getNodeIdsConnectedFrom(nodeId, type)) {
      this.removeEdge(nodeId, to, type);
    }
  }

  // Removes edge and node the edge is to if the node is orphaned
  removeEdge(
    from: NodeId,
    to: NodeId,
    type: TEdgeType | NullEdgeType = 1,
    removeOrphans: boolean = true,
  ) {
    if (!this.adjacencyList.hasEdge(from, to, type)) {
      throw new Error(
        `Edge from ${fromNodeId(from)} to ${fromNodeId(to)} not found!`,
      );
    }

    this.adjacencyList.removeEdge(from, to, type);
    if (removeOrphans && this.isOrphanedNode(to)) {
      this.removeNode(to);
    }
  }

  isOrphanedNode(nodeId: NodeId): boolean {
    this._assertHasNodeId(nodeId);

    if (this.rootNodeId == null) {
      // If the graph does not have a root, and there are inbound edges,
      // this node should not be considered orphaned.
      // return false;
      // for (let id of this.getNodeIdsConnectedTo(nodeId)) {
      //   if (this.hasNode(id)) return false;
      // }
      if (this.getNodeIdsConnectedTo(nodeId, ALL_EDGE_TYPES).length) {
        return false;
      }

      return true;
    }

    // Otherwise, attempt to traverse backwards to the root. If there is a path,
    // then this is not an orphaned node.
    let hasPathToRoot = false;
    // go back to traverseAncestors
    this.traverseAncestors(
      nodeId,
      (ancestorId, _, actions) => {
        if (ancestorId === this.rootNodeId) {
          hasPathToRoot = true;
          actions.stop();
        }
      },
      // $FlowFixMe
      ALL_EDGE_TYPES,
    );

    if (hasPathToRoot) {
      return false;
    }

    return true;
  }

  updateNode(nodeId: NodeId, node: TNode): void {
    this._assertHasNodeId(nodeId);
    this.nodes.set(nodeId, node);
  }

  // TODO: remove because this isn't actually used anywhere?
  // replaceNode(
  //   fromNodeId: NodeId,
  //   toNodeId: NodeId,
  //   type: TEdgeType | NullEdgeType = 0,
  // ): void {
  //   this._assertHasNodeId(fromNodeId);
  //   for (let parent of this.inboundEdges.getEdges(fromNodeId, type)) {
  //     this.addEdge(parent, toNodeId, type);
  //     this.removeEdge(parent, fromNodeId, type);
  //   }
  //   this.removeNode(fromNodeId);
  // }

  // Update a node's downstream nodes making sure to prune any orphaned branches
  replaceNodeIdsConnectedTo(
    fromNodeId: NodeId,
    toNodeIds: $ReadOnlyArray<NodeId>,
    replaceFilter?: null | (NodeId => boolean),
    type?: TEdgeType | NullEdgeType = 1,
  ): void {
    this._assertHasNodeId(fromNodeId);

    let outboundEdges = this.getNodeIdsConnectedFrom(fromNodeId, type);
    let childrenToRemove = new Set(
      replaceFilter
        ? [...outboundEdges].filter(toNodeId => replaceFilter(toNodeId))
        : outboundEdges,
    );
    for (let toNodeId of toNodeIds) {
      childrenToRemove.delete(toNodeId);

      if (!this.hasEdge(fromNodeId, toNodeId, type)) {
        this.addEdge(fromNodeId, toNodeId, type);
      }
    }

    for (let child of childrenToRemove) {
      this.removeEdge(fromNodeId, child, type);
    }
  }

  traverse<TContext>(
    visit: GraphVisitor<NodeId, TContext>,
    startNodeId: ?NodeId,
    type: TEdgeType | NullEdgeType | Array<TEdgeType | NullEdgeType> = 1,
  ): ?TContext {
    return this.dfs({
      visit,
      startNodeId,
      getChildren: nodeId => this.getNodeIdsConnectedFrom(nodeId, type),
    });
  }

  filteredTraverse<TValue, TContext>(
    filter: (NodeId, TraversalActions) => ?TValue,
    visit: GraphVisitor<TValue, TContext>,
    startNodeId: ?NodeId,
    type?: TEdgeType | Array<TEdgeType | NullEdgeType>,
  ): ?TContext {
    return this.traverse(mapVisitor(filter, visit), startNodeId, type);
  }

  traverseAncestors<TContext>(
    startNodeId: ?NodeId,
    visit: GraphVisitor<NodeId, TContext>,
    type: TEdgeType | NullEdgeType | Array<TEdgeType | NullEdgeType> = 1,
  ): ?TContext {
    return this.dfs({
      visit,
      startNodeId,
      getChildren: nodeId => this.getNodeIdsConnectedTo(nodeId, type),
    });
  }

  dfs<TContext>({
    visit,
    startNodeId,
    getChildren,
  }: {|
    visit: GraphVisitor<NodeId, TContext>,
    getChildren(nodeId: NodeId): Array<NodeId>,
    startNodeId?: ?NodeId,
  |}): ?TContext {
    let traversalStartNode = nullthrows(
      startNodeId ?? this.rootNodeId,
      'A start node is required to traverse',
    );
    this._assertHasNodeId(traversalStartNode);

    let visited = new Set<NodeId>();
    let stopped = false;
    let skipped = false;
    let actions: TraversalActions = {
      skipChildren() {
        skipped = true;
      },
      stop() {
        stopped = true;
      },
    };

    let walk = (nodeId, context: ?TContext) => {
      if (!this.hasNode(nodeId)) return;
      visited.add(nodeId);

      skipped = false;
      let enter = typeof visit === 'function' ? visit : visit.enter;
      if (enter) {
        let newContext = enter(nodeId, context, actions);
        if (typeof newContext !== 'undefined') {
          // $FlowFixMe[reassign-const]
          context = newContext;
        }
      }

      if (skipped) {
        return;
      }

      if (stopped) {
        return context;
      }

      for (let child of getChildren(nodeId)) {
        if (visited.has(child)) {
          continue;
        }

        visited.add(child);
        let result = walk(child, context);
        if (stopped) {
          return result;
        }
      }

      if (typeof visit !== 'function' && visit.exit) {
        let newContext = visit.exit(nodeId, context, actions);
        if (typeof newContext !== 'undefined') {
          // $FlowFixMe[reassign-const]
          context = newContext;
        }
      }

      if (skipped) {
        return;
      }

      if (stopped) {
        return context;
      }
    };

    return walk(traversalStartNode);
  }

  bfs(visit: (nodeId: NodeId) => ?boolean): ?NodeId {
    let rootNodeId = nullthrows(
      this.rootNodeId,
      'A root node is required to traverse',
    );

    let queue: Array<NodeId> = [rootNodeId];
    let visited = new Set<NodeId>([rootNodeId]);

    while (queue.length > 0) {
      let node = queue.shift();
      let stop = visit(rootNodeId);
      if (stop === true) {
        return node;
      }

      for (let child of this.getNodeIdsConnectedFrom(node)) {
        if (!visited.has(child)) {
          visited.add(child);
          queue.push(child);
        }
      }
    }

    return null;
  }

  findAncestor(nodeId: NodeId, fn: (nodeId: NodeId) => boolean): ?NodeId {
    let res = null;
    this.traverseAncestors(nodeId, (nodeId, ctx, traversal) => {
      if (fn(nodeId)) {
        res = nodeId;
        traversal.stop();
      }
    });
    return res;
  }

  findAncestors(
    nodeId: NodeId,
    fn: (nodeId: NodeId) => boolean,
  ): Array<NodeId> {
    let res = [];
    this.traverseAncestors(nodeId, (nodeId, ctx, traversal) => {
      if (fn(nodeId)) {
        res.push(nodeId);
        traversal.skipChildren();
      }
    });
    return res;
  }

  findDescendant(nodeId: NodeId, fn: (nodeId: NodeId) => boolean): ?NodeId {
    let res = null;
    this.traverse((nodeId, ctx, traversal) => {
      if (fn(nodeId)) {
        res = nodeId;
        traversal.stop();
      }
    }, nodeId);
    return res;
  }

  findDescendants(
    nodeId: NodeId,
    fn: (nodeId: NodeId) => boolean,
  ): Array<NodeId> {
    let res = [];
    this.traverse((nodeId, ctx, traversal) => {
      if (fn(nodeId)) {
        res.push(nodeId);
        traversal.skipChildren();
      }
    }, nodeId);
    return res;
  }

  _assertHasNodeId(nodeId: NodeId) {
    if (!this.hasNode(nodeId)) {
      throw new Error('Does not have node ' + fromNodeId(nodeId));
    }
  }
}

export function mapVisitor<NodeId, TValue, TContext>(
  filter: (NodeId, TraversalActions) => ?TValue,
  visit: GraphVisitor<TValue, TContext>,
): GraphVisitor<NodeId, TContext> {
  return {
    enter: (nodeId, context, actions) => {
      let enter = typeof visit === 'function' ? visit : visit.enter;
      if (!enter) {
        return;
      }

      let value = filter(nodeId, actions);
      if (value != null) {
        return enter(value, context, actions);
      }
    },
    exit: (nodeId, context, actions) => {
      if (typeof visit === 'function') {
        return;
      }

      let exit = visit.exit;
      if (!exit) {
        return;
      }

      let value = filter(nodeId, actions);
      if (value != null) {
        return exit(value, context, actions);
      }
    },
  };
}

type AdjacencyListMap<TEdgeType> = Map<NodeId, Map<TEdgeType, Set<NodeId>>>;
class AdjacencyList<TEdgeType> {
  _listMap: AdjacencyListMap<TEdgeType>;

  constructor(listMap?: AdjacencyListMap<TEdgeType>) {
    this._listMap = listMap ?? new Map();
  }

  getListMap(): AdjacencyListMap<TEdgeType> {
    return this._listMap;
  }

  getEdges(from: NodeId, type: TEdgeType): $ReadOnlySet<NodeId> {
    return this._listMap.get(from)?.get(type) ?? new Set();
  }

  getEdgesByType(from: NodeId): $ReadOnlyMap<TEdgeType, $ReadOnlySet<NodeId>> {
    return this._listMap.get(from) ?? new Map();
  }

  hasEdge(from: NodeId, to: NodeId, type: TEdgeType): boolean {
    return Boolean(
      this._listMap
        .get(from)
        ?.get(type)
        ?.has(to),
    );
  }

  addEdge(from: NodeId, to: NodeId, type: TEdgeType): void {
    let types = this._listMap.get(from);
    if (types == null) {
      types = new Map<TEdgeType, Set<NodeId>>();
      this._listMap.set(from, types);
    }

    let adjacent = types.get(type);
    if (adjacent == null) {
      adjacent = new Set<NodeId>();
      types.set(type, adjacent);
    }
    adjacent.add(to);
  }

  removeEdge(from: NodeId, to: NodeId, type: TEdgeType): void {
    this._listMap
      .get(from)
      ?.get(type)
      ?.delete(to);
  }
}
