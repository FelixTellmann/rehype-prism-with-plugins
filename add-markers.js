/**
 * Code <s>copied</s> inspired from from:
 * https://github.com/rexxars/react-refractor/blob/master/src/addMarkers.js
 */
const lineNumberify = function lineNumberify(ast, lineNum = 1) {
  let lineNumber = lineNum;
  return ast.reduce(
    (result, node) => {
      if (result.lineNumber) {
        lineNumber = result.lineNumber;
      }
      if (node.type === 'text') {
        if (node.value.indexOf('\n') === -1) {
          node.lineNumber = lineNumber;
          result.nodes.push(node);
          return result;
        }

        const lines = node.value.split('\n');
        for (let i = 0; i < lines.length; i++) {
          result.nodes.push({
            type: 'text',
            value: i === lines.length - 1 ? lines[i] : `${lines[i]}\n`,
            lineNumber: i === 0 ? lineNumber : ++lineNumber
          });
        }

        result.lineNumber = lineNumber;
        return result;
      }

      if (node.children) {
        node.lineNumber = lineNumber;
        const processed = lineNumberify(node.children, lineNumber);
        node.children = processed.nodes;
        result.lineNumber = processed.lineNumber;
        result.nodes.push(node);
        return result;
      }

      result.nodes.push(node);
      return result;
    },
    { nodes: [], lineNumber: lineNumber }
  );
};

const makeLine = (markers, line, children, options) => {
  return {
    type: 'element',
    tagName: 'div',
    properties: {
      className: `line ${markers[line].highlight ? 'line-highlight' : ''}`
    },
    children: [
      {
        type: 'element',
        tagName: 'span',
        properties: { className: 'line-number' },
        children: [
          {
            type: 'text',
            value: options.showLineNumbers
              ? `${markers[line].line.toString()}`
              : '',
            lineNumber: markers[line].line
          }
        ],
        lineNumber: markers[line].line
      },
      ...children
    ],
    lineNumber: markers[line].line
  };
};

const wrapLines = function wrapLines(ast, markers, options) {
  function findLines(
    ast,
    astIndex,
    markers,
    ln,
    tree = [],
    subTree = [],
    length = 0,
    rootIndex = 0,
    currentAst = []
  ) {
    if (!ast[astIndex]) {
      if (subTree.length > 0) {
        tree.push(makeLine(markers, ln, subTree, options));
      }
      return tree;
    }
    const { children, position, lineNumber } = ast[astIndex];
    const { line } = markers[ln];

    if (position && position.start.line === position.end.line) {
      if (lineNumber === line) {
        subTree.push(ast[astIndex]);
        if (astIndex === length - 1) {
          return findLines(currentAst, ++rootIndex, markers, ln, tree, subTree);
        }
        return findLines(
          ast,
          ++astIndex,
          markers,
          ln,
          tree,
          subTree,
          length,
          rootIndex,
          currentAst
        );
      }
      if (lineNumber > line) {
        return findLines(
          ast,
          astIndex,
          markers,
          ++ln,
          tree,
          [],
          length,
          rootIndex,
          currentAst
        );
      }
    }

    if (position && position.start.line !== position.end.line) {
      if (lineNumber === line) {
        findLines(
          children,
          0,
          markers,
          ln,
          tree,
          subTree,
          children.length,
          astIndex,
          ast
        );
      }
    }

    if (!position) {
      if (lineNumber === line) {
        subTree.push(ast[astIndex]);

        if (astIndex === length - 1) {
          return findLines(
            currentAst,
            ++rootIndex,
            markers,
            ln,
            tree,
            subTree,
            length
          );
        }
        return findLines(
          ast,
          ++astIndex,
          markers,
          ln,
          tree,
          subTree,
          length,
          rootIndex,
          currentAst
        );
      }
      if (lineNumber > line) {
        if (subTree.length > 0) {
          tree.push(makeLine(markers, ln, subTree, options));
        }

        return findLines(
          ast,
          astIndex,
          markers,
          ++ln,
          tree,
          [],
          length,
          rootIndex,
          currentAst
        );
      }
    }

    return tree;
  }

  return findLines(ast, 0, markers, 0, [], [], ast.length);
};

module.exports = function(ast, options) {
  const numbered = lineNumberify(ast).nodes;
  if (numbered[numbered.length - 1]) {
    if (
      numbered[numbered.length - 1].value === '' &&
      numbered[numbered.length - 1].type === 'text'
    ) {
      numbered.length = numbered.length - 1;
    }
  }
  const lineLength = numbered[numbered.length - 1].lineNumber;
  let lineNumbers = [];
  for (let i = 1; i <= lineLength; i++) {
    lineNumbers.push({ line: i });
  }

  options.markers &&
    options.markers.forEach(marker => {
      if (lineNumbers[(marker.line ? marker.line : marker) - 1]) {
        lineNumbers[(marker.line ? marker.line : marker) - 1][
          'highlight'
        ] = true;
      }
    });

  return wrapLines(numbered, lineNumbers, options);
};
