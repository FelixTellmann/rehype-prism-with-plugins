const makeLine = (markers, line, children, options, classNames = []) => {
  if (typeof classNames === 'string') {
    classNames = [classNames];
  }

  function extractWhitespace(children) {
    if (
      children &&
      children[0].type === 'text' &&
      /^\s+$/.test(children[0].value)
    ) {
      return children.splice(0, 1)[0];
    } else if (
      children &&
      children[0].type === 'text' &&
      /^\s+/.test(children[0].value)
    ) {
      const returnObject = {
        type: 'text',
        value: /^\s+/.exec(children[0].value)[0]
      };
      children[0].value = children[0].value.replace(/^\s+/, '');
      return returnObject;
    } else if (
      children &&
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
      className: [`line`, markers[line].highlight ? 'line-highlight' : '']
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
            properties: { className: ['line-content', ...classNames] },
            children: [...children],
            lineNumber: markers[line].line
          }
        : {}
    ],
    lineNumber: markers[line].line
  };
};

const wrapLines = function wrapLines(ast, markers, lineCount, options) {
  let tree = {};
  function addLineNumbers(ast, a, b) {
    ast.forEach((astItem, index) => {
      if (!astItem.used) {
        for (let i = a; i <= b; i++) {
          if (
            (astItem.position &&
              astItem.position.start.line === astItem.position.end.line &&
              astItem.position.start.line === i) ||
            (!astItem.position && astItem.type === 'text')
          ) {
            if (astItem.type === 'text' && astItem.value === '') {
            } else {
              tree[`line-${i}`] = tree[`line-${i}`]
                ? [...tree[`line-${i}`], astItem]
                : [astItem];
            }
            ast[index]['used'] = true;
          }

          if (
            astItem.position &&
            astItem.position.start.line !== astItem.position.end.line &&
            astItem.position.start.line === i
          ) {
            if (astItem.type === 'text' && astItem.value.indexOf('\n') !== -1) {
              const textArr = astItem.value.split('\n');
              textArr.forEach((value, vi) => {
                if (value !== '') {
                  tree[`line-${i + vi}`] = tree[`line-${i + vi}`]
                    ? [...tree[`line-${i + vi}`], { type: 'text', value }]
                    : [{ type: 'text', value }];
                }
              });
              ast[index]['used'] = true;
            } else {
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
      }
    });
  }
  addLineNumbers(ast, 1, lineCount);

  let finalTree = [];
  for (let i = 1; i < lineCount; i++) {
    finalTree.push(
      makeLine(
        markers,
        i - 1,
        tree[`line-${i}`] ? tree[`line-${i}`] : [{ type: 'text', value: '' }],
        options,
        tree[`class-${i}`]
      )
    );
  }

  return finalTree;
};

module.exports = function(ast, options) {
  let lineLength = ast[ast.length - 1]
    ? ast[ast.length - 1].position ? ast[ast.length - 1].position.end.line : 1
    : 1;
  let markers = [];
  for (let i = 1; i <= lineLength; i++) {
    markers.push({ line: i });
  }

  options.markers &&
    options.markers.forEach(marker => {
      if (markers[(marker.line ? marker.line : marker) - 1]) {
        markers[(marker.line ? marker.line : marker) - 1]['highlight'] = true;
      }
    });

  return wrapLines(ast, markers, lineLength, options);
};
