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

const wrapLines = function wrapLines(ast, markers, lineCount, options) {
  function createTree(ast, markers, lineCount, options) {
    let tree = {};
    function addLineNumbers(ast, lineCount) {
      ast.forEach((astItem, index) => {
        for (let i = 1; i <= lineCount; i++) {
          if (!astItem.used) {
            if (
              astItem.lineNumber === i &&
              ((astItem.position &&
                astItem.position.start.line === astItem.position.end.line) ||
                (!astItem.position && astItem.type === 'text'))
            ) {
              tree[`line-${astItem.lineNumber}`] = tree[
                `line-${astItem.lineNumber}`
              ]
                ? [...tree[`line-${astItem.lineNumber}`], astItem]
                : [astItem];
              ast[index]['used'] = true;
            }
            if (
              astItem.lineNumber === i &&
              astItem.position &&
              astItem.position.start.line !== astItem.position.end.line
            ) {
              addLineNumbers(astItem.children, lineCount);
            }
          }
        }
      });
    }
    addLineNumbers(ast, lineCount);

    return Object.entries(tree)
      .map(([key, values]) =>
        makeLine(markers, +key.replace('line-', '') - 1, values, options)
      )
      .sort((a, b) => a.lineNumber - b.lineNumber);
  }

  return createTree(ast, markers, lineCount, options);
};

module.exports = function(ast, options) {
  const { nodes } = lineNumberify(ast);

  if (nodes[nodes.length - 1]) {
    if (
      nodes[nodes.length - 1].value === '' &&
      nodes[nodes.length - 1].type === 'text'
    ) {
      nodes.length = nodes.length - 1;
    }
  }
  const lineNumber = nodes[nodes.length - 1].lineNumber;

  let lineNumbers = [];
  for (let i = 1; i <= lineNumber; i++) {
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

  return wrapLines(nodes, lineNumbers, lineNumber, options);
};
