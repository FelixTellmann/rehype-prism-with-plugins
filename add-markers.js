/**
 * Code <s>copied</s> inspired from from:
 * https://github.com/rexxars/react-refractor/blob/master/src/addMarkers.js
 */
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

const makeLine = (markers, line, children, options, classNames = []) => {
  if (typeof classNames === 'string') {
    classNames = [classNames];
  }

  function extractWhitespace(children) {
    if (children[0].type === 'text' && /^\s+$/.test(children[0].value)) {
      return children.splice(0, 1)[0];
    } else if (children[0].type === 'text' && /^\s+/.test(children[0].value)) {
      const returnObject = {
        type: 'text',
        value: /^\s+/.exec(children[0].value)[0]
      };
      children[0].value = children[0].value.replace(/^\s+/, '');
      return returnObject;
    } else if (
      children[0] &&
      children[0].children &&
      children[0].children.length > 0
    ) {
      return extractWhitespace(children[0].children);
    } else {
      return false;
    }
  }

  let whitespace = extractWhitespace(children);

  return {
    type: 'element',
    tagName: 'div',
    properties: {
      className: [
        `line`,
        markers[line].highlight ? 'line-highlight' : '',
        ...classNames
      ]
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
      {
        type: 'element',
        tagName: 'span',
        properties: { className: 'white-space' },
        children: [whitespace ? whitespace : { type: 'text', value: '' }],
        lineNumber: markers[line].line
      },
      children.length > 0
        ? {
            type: 'element',
            tagName: 'span',
            properties: { className: 'line-content' },
            children: [...children],
            lineNumber: markers[line].line
          }
        : {}
    ],
    lineNumber: markers[line].line
  };
};

const wrapLines = function wrapLines(ast, markers, lineCount, options) {
  function createTree(ast, markers, lineCount, options) {
    let tree = {};

    function addLineNumbers(ast, a, b) {
      ast.forEach((astItem, index) => {
        if (!astItem.used) {
          for (let i = a; i <= b; i++) {
            if (
              astItem.lineNumber === i &&
              ((astItem.position &&
                astItem.position.start.line === astItem.position.end.line) ||
                (!astItem.position && astItem.type === 'text'))
            ) {
              if (astItem.type === 'text' && astItem.value === '') {
              } else {
                tree[`line-${astItem.lineNumber}`] = tree[
                  `line-${astItem.lineNumber}`
                ]
                  ? [...tree[`line-${astItem.lineNumber}`], astItem]
                  : [astItem];
              }
              ast[index]['used'] = true;
            }
            if (
              astItem.lineNumber === i &&
              astItem.position &&
              astItem.position.start.line !== astItem.position.end.line
            ) {
              for (
                let j = astItem.position.start.line;
                j <= astItem.position.end.line;
                j++
              ) {
                tree[`class-${j}`] = tree[`class-${j}`]
                  ? [
                      ...new Set([
                        ...tree[`class-${j}`],
                        ...astItem.properties.className
                      ])
                    ]
                  : [...astItem.properties.className];
              }
              ast[index]['used'] = true;
              addLineNumbers(
                astItem.children,
                astItem.position.start.line,
                astItem.position.end.line
              );
            }
          }
        }
      });
    }

    addLineNumbers(ast, 1, lineCount);

    return Object.entries(tree)
      .reduce((acc, [key, values]) => {
        if (key.includes('class')) {
          if (acc[+key.replace('class-', '') - 1]) {
            acc[+key.replace('class-', '') - 1].properties.className
              ? typeof acc[+key.replace('class-', '') - 1].properties
                  .className === 'string'
                ? (acc[+key.replace('class-', '') - 1].properties.className = [
                    acc[+key.replace('class-', '') - 1].properties.className,
                    ...values
                  ])
                : (acc[+key.replace('class-', '') - 1].properties.className = [
                    ...acc[+key.replace('class-', '') - 1].properties.className,
                    ...values
                  ])
              : (acc[
                  +key.replace('class-', '') - 1
                ].properties.className = values);
          } else {
            acc[+key.replace('class-', '') - 1] = values;
          }
          return acc;
        } else {
          if (
            acc[+key.replace('line-', '') - 1] &&
            Array.isArray(acc[+key.replace('line-', '') - 1])
          ) {
            acc[+key.replace('line-', '') - 1] = makeLine(
              markers,
              +key.replace('line-', '') - 1,
              values,
              options,
              acc[+key.replace('line-', '') - 1]
            );
          } else {
            acc[+key.replace('line-', '') - 1] = makeLine(
              markers,
              +key.replace('line-', '') - 1,
              values,
              options
            );
          }
          return acc;
        }
      }, [])
      .sort((a, b) => a.lineNumber - b.lineNumber);
  }
  const test = createTree(ast, markers, lineCount, options);
  return test;
};

module.exports = function(ast, options) {
  let { nodes, lineNumber } = lineNumberify(ast);

  if (nodes[nodes.length - 1]) {
    if (
      nodes[nodes.length - 1].value === '' &&
      nodes[nodes.length - 1].type === 'text'
    ) {
      nodes.length = nodes.length - 1;
    }
  }
  lineNumber = nodes[nodes.length - 1].lineNumber;

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
