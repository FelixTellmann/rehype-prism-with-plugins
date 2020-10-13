/**
 * Code <s>copied</s> inspired from from:
 * https://github.com/rexxars/react-refractor/blob/master/src/addMarkers.js
 */
const lineNumberify = function lineNumberify(ast, lineNum = 1) {
  let lineNumber = lineNum;
  return ast.reduce(
    (result, node) => {
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

const wrapLines = function wrapLines(ast, markers, options) {
  let i = 0;

  const wrapped = markers.reduce((nodes, marker) => {
    const { line, highlight } = marker;
    const children = [];
    for (; i < ast.length; i++) {
      if (ast[i].lineNumber < line) {
        nodes.push(ast[i]);
        continue;
      }

      if (ast[i].lineNumber === line) {
        children.push(ast[i]);
        continue;
      }

      if (ast[i].lineNumber > line) {
        break;
      }
    }

    nodes.push({
      type: 'element',
      tagName: marker.component || 'div',
      properties: marker.component
        ? options
        : {
            className:
              marker.className || `line ${highlight ? 'line-highlight' : ''}`
          },
      children: [
        {
          type: 'element',
          tagName: 'span',
          properties: { className: 'line-number' },
          children: [
            { type: 'text', value: `${line.toString()}`, lineNumber: line }
          ],
          lineNumber: line
        },
        ...children
      ],
      lineNumber: line
    });

    return nodes;
  }, []);

  for (; i < ast.length; i++) {
    wrapped.push(ast[i]);
  }

  return wrapped;
};

module.exports = function(ast, options) {
  const numbered = lineNumberify(ast).nodes;
  const lineLength = numbered[numbered.length - 1].lineNumber;
  let lineNumbers = [];
  for (let i = 1; i <= lineLength; i++) {
    lineNumbers.push({ line: i });
  }

  options.markers &&
    options.markers.forEach(marker => {
      lineNumbers[(marker.line ? marker.line : marker) - 1]['highlight'] = true;
    });

  const markers = options.markers
    ? options.markers
        .map(marker => {
          return marker.line ? marker : { line: marker };
        })
        .sort((nodeA, nodeB) => {
          return nodeA.line - nodeB.line;
        })
    : {};

  return wrapLines(
    numbered,
    options.showLineNumbers ? lineNumbers : markers,
    options
  );
};
