import type { BunPlugin } from 'bun';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import { readdirSync } from 'fs';
import { dirname } from 'path';

const uploadToolsS3Path = 'system/plugin/tools';
const publicBaseUrl = 'https://os.ipollo.net';
const iconFormats = ['svg', 'png', 'jpeg', 'webp', 'jpg'];

const getLocalIconFilename = (filePath: string) => {
  const dir = dirname(filePath);
  const files = readdirSync(dir);
  return files.find((file) => {
    const dotIndex = file.lastIndexOf('.');
    return (
      dotIndex > -1 &&
      file.slice(0, dotIndex) === 'logo' &&
      iconFormats.includes(file.slice(dotIndex + 1))
    );
  });
};

const hasTopLevelProperty = (objectExpression: any, name: string) =>
  objectExpression.properties.some(
    (property: any) =>
      property.type === 'ObjectProperty' &&
      property.key.type === 'Identifier' &&
      property.key.name === name
  );

const addStringProperty = (objectExpression: any, name: string, value: string) => {
  objectExpression.properties.push({
    type: 'ObjectProperty',
    key: {
      type: 'Identifier',
      name
    },
    value: {
      type: 'StringLiteral',
      value
    },
    computed: false,
    shorthand: false
  });
};

const transformSourceCode = async ({
  sourceCode,
  filePath
}: {
  sourceCode: string;
  filePath: string;
}) => {
  const ast = parse(sourceCode, {
    plugins: ['typescript'],
    sourceType: 'module'
  });
  const toolId = (() => {
    const stack = filePath.split('/');
    if (stack.at(-3) === 'children') {
      const parentName = stack.at(-4);
      return `${parentName}/${stack.at(-2)}`;
    } else {
      return stack.at(-2);
    }
  })() as string;

  traverse(ast, {
    CallExpression(path) {
      if (
        path.node.callee.type === 'Identifier' &&
        ['defineTool', 'defineToolSet'].includes(path.node.callee.name) &&
        path.node.arguments[0] &&
        path.node.arguments[0].type === 'ObjectExpression'
      ) {
        const configObject = path.node.arguments[0];
        const hasToolId = hasTopLevelProperty(configObject, 'toolId');
        // console.log('hasToolId', hasToolId, toolId);
        if (!hasToolId) {
          addStringProperty(configObject, 'toolId', toolId);
        }

        const iconFilename = getLocalIconFilename(filePath);
        if (iconFilename) {
          const iconUrl = `${publicBaseUrl}/${uploadToolsS3Path}/${toolId}/logo`;
          const hasIcon = hasTopLevelProperty(configObject, 'icon');
          const hasAvatar = hasTopLevelProperty(configObject, 'avatar');
          if (!hasIcon) {
            addStringProperty(configObject, 'icon', iconUrl);
          }
          if (!hasAvatar) {
            addStringProperty(configObject, 'avatar', iconUrl);
          }
        }

        if (path.node.callee.name === 'defineToolSet') {
          const hasCustomChildren = hasTopLevelProperty(configObject, 'children');
          if (hasCustomChildren) {
            return;
          }
          // now filePath: modules/tool/packages/[toolSet]/config.ts
          // get the children dir : modules/tool/packages/[toolSet]/children
          const childrenDir = filePath.split('/').slice(0, -1).join('/') + '/children';
          // get children's name
          const children = readdirSync(childrenDir);
          // add import and children property
          // add import sentences
          for (const child of children) {
            ast.program.body.unshift({
              type: 'ImportDeclaration',
              source: {
                type: 'StringLiteral',
                value: `./children/${child}`
              },
              importKind: 'value',
              specifiers: [
                {
                  type: 'ImportDefaultSpecifier',
                  local: {
                    type: 'Identifier',
                    name: child
                  }
                }
              ]
            });
          }
          // add children property
          path.node.arguments[0].properties.push({
            type: 'ObjectProperty',
            key: {
              type: 'Identifier',
              name: 'children'
            },
            value: {
              type: 'ArrayExpression',
              elements: children.map((child) => {
                return {
                  type: 'Identifier',
                  name: child
                };
              })
            },
            computed: false,
            shorthand: false
          });
        }
      }
    }
  });
  return generate(ast).code;
};

export const autoToolIdPlugin: BunPlugin = {
  name: 'buildTool',
  setup(build) {
    build.onLoad(
      {
        filter: /packages\/.+\/config\.ts/
      },
      async (args) => {
        const content = await Bun.file(args.path).text();
        return {
          contents: await transformSourceCode({
            sourceCode: content,
            filePath: args.path
          }),
          loader: 'ts'
        };
      }
    );
  },
  target: 'node'
};
