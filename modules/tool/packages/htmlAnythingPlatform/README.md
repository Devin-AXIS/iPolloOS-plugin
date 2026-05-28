# HTML Anything 生成器

该插件内置 `nexu-io/html-anything` 的 75 个模板 prompt，通过 `html_anything_page` 工具按 `template_id` 选择模板生成完整单文件 HTML。

默认 `page_output_mode=auto_publish`，工具在插件能力层生成完整 HTML 后直接发布到 OSS 公网域名并返回 `page_url`，不会把大段 `page_html/full_html` 回传到聊天和运行预览里。只有 `raw_html` 模式会返回完整源码。

模板来源：https://github.com/nexu-io/html-anything

上游模板许可：Apache-2.0，许可证副本见本源码目录 `HTML_ANYTHING_LICENSE`。
