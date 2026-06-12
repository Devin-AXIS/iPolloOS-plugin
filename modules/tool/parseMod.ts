import { ToolTagEnum } from '@tool/type/tags';
import { UploadToolsS3Path } from './constants';
import type { ToolSetType, ToolType } from './type';
import { generateToolVersion, generateToolSetVersion } from './utils/tool';
import { publicS3Server } from '@/s3';

const getToolVersionLabel = (versionList?: Array<{ value: string }>) =>
  versionList?.[0]?.value || '';

const getToolSetVersionLabel = (children: ToolType[]) => {
  const labels = Array.from(
    new Set(children.map((child) => getToolVersionLabel(child.versionList)).filter(Boolean))
  );
  return labels.join('/');
};

const getPublicBaseUrl = () =>
  (process.env.STORAGE_PUBLIC_BASE_URL || process.env.STORAGE_EXTERNAL_ENDPOINT || '').replace(
    /\/+$/,
    ''
  );

export const getIconPath = (name: string) => {
  const objectName = `${UploadToolsS3Path}/${name}`;
  const publicBaseUrl = getPublicBaseUrl();

  return publicBaseUrl
    ? `${publicBaseUrl}/${objectName}`
    : publicS3Server.generateExternalUrl(objectName);
};

const basename = (objectName: string) => objectName.split('/').pop() || '';

export const resolveIconPath = async (name: string) => {
  const objectName = `${UploadToolsS3Path}/${name}`;
  const dir = objectName.split('/').slice(0, -1).join('/');
  const expectedName = basename(objectName);

  try {
    const files = await publicS3Server.getFiles(dir);
    const iconFile = files.find((file) => {
      if (file.split('/').slice(0, -1).join('/') !== dir) return false;
      const fileBase = basename(file);
      const dotIndex = fileBase.lastIndexOf('.');
      return (dotIndex > -1 ? fileBase.slice(0, dotIndex) : fileBase) === expectedName;
    });

    if (iconFile) {
      const publicBaseUrl = getPublicBaseUrl();
      return publicBaseUrl
        ? `${publicBaseUrl}/${iconFile.replace(/^\/+/, '')}`
        : publicS3Server.generateExternalUrl(iconFile);
    }
  } catch {
    // Fallback to the historical extensionless path.
  }

  return getIconPath(name);
};

export const parseMod = async ({
  rootMod,
  filename,
  temp = false
}: {
  rootMod: ToolSetType | ToolType;
  filename: string;
  temp?: boolean;
}) => {
  const tools: ToolType[] = [];
  const checkRootModToolSet = (rootMod: ToolType | ToolSetType): rootMod is ToolSetType => {
    return 'children' in rootMod;
  };
  if (checkRootModToolSet(rootMod)) {
    const toolsetId = rootMod.toolId;

    const parentIcon =
      (await resolveIconPath(`${temp ? 'temp/' : ''}${toolsetId}/logo`)) || rootMod.icon;

    const children = rootMod.children;

    for (const child of children) {
      const childToolId = child.toolId;
      const childIconPath = childToolId.startsWith(`${toolsetId}/`)
        ? childToolId
        : `${toolsetId}/${childToolId}`;

      const childIcon =
        (await resolveIconPath(`${temp ? 'temp/' : ''}${childIconPath}/logo`)) ||
        child.icon ||
        rootMod.icon;

      // Generate version for child tool
      const childVersion = generateToolVersion(child.versionList);
      tools.push({
        ...child,
        toolId: childToolId,
        parentId: toolsetId,
        tags: rootMod.tags,
        courseUrl: rootMod.courseUrl,
        author: rootMod.author,
        icon: childIcon,
        avatar: childIcon,
        toolFilename: filename,
        version: childVersion,
        versionLabel: getToolVersionLabel(child.versionList)
      });
    }

    // push parent
    tools.push({
      ...rootMod,
      tags: rootMod.tags || [ToolTagEnum.enum.other],
      toolId: toolsetId,
      icon: parentIcon,
      avatar: parentIcon,
      toolFilename: `${filename}`,
      cb: () => Promise.resolve({}),
      versionList: [],
      version: generateToolSetVersion(children) || '',
      versionLabel: getToolSetVersionLabel(children)
    });
  } else {
    // is not toolset
    const toolId = rootMod.toolId;

    const icon = (await resolveIconPath(`${temp ? 'temp/' : ''}${toolId}/logo`)) || rootMod.icon;

    tools.push({
      ...rootMod,
      tags: rootMod.tags || [ToolTagEnum.enum.tools],
      icon,
      avatar: icon,
      toolId,
      toolFilename: filename,
      version: generateToolVersion(rootMod.versionList),
      versionLabel: getToolVersionLabel(rootMod.versionList)
    });
  }
  return tools;
};
