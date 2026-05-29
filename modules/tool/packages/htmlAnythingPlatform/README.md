# HTML Anything 生成器

该插件内置 `nexu-io/html-anything` 的模板分类与运行增强能力。HTML 的生成由 FastGPT AI 大脑 / Agent完成，`html_anything_page` 工具只接收已经生成好的完整单文件 HTML，做校验、运行层注入和发布。

默认 `page_output_mode=auto_publish`，工具在插件能力层把 `content` 中的完整 HTML 发布到 OSS 公网域名并返回 `page_url`，不会把大段 `page_html/full_html` 回传到聊天和运行预览里。只有 `raw_html` 模式会返回完整源码。

工具不会二次调用 AI 应用，也不需要 `HTML_ANYTHING_AI_APP_KEY`。如果 `content` 不是完整 HTML，工具会返回错误，上游 AI 大脑应重新生成完整 HTML 后再次调用。

模板来源：https://github.com/nexu-io/html-anything

上游模板许可：Apache-2.0，许可证副本见本源码目录 `HTML_ANYTHING_LICENSE`。
