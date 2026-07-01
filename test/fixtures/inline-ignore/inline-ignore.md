# Inline Ignore Test

This link should be checked: [Google](https://www.google.com)

<!-- linkspector-disable -->
This link should be ignored: [Broken1](https://this-domain-does-not-exist-linkspector.example.com/page1)
Another ignored link: [Broken2](https://this-domain-does-not-exist-linkspector.example.com/page2)
<!-- linkspector-enable -->

This link should be checked: [GitHub](https://github.com)

<!-- linkspector-disable-next-line -->
[Broken3](https://this-domain-does-not-exist-linkspector.example.com/page3)

This link should be checked: [Example](https://www.example.com)

<!-- markdown-link-check-disable -->
[Broken4](https://this-domain-does-not-exist-linkspector.example.com/page4)
<!-- markdown-link-check-enable -->

<!-- markdown-link-check-disable-next-line -->
[Broken5](https://this-domain-does-not-exist-linkspector.example.com/page5)

This link should be checked: [Wikipedia](https://www.wikipedia.org)

[Broken8](https://this-domain-does-not-exist-linkspector.example.com/page8) <!-- markdown-link-check-disable-line -->

<!-- markdownlint-disable-next-line -->
[Broken9](https://this-domain-does-not-exist-linkspector.example.com/page9)

[Broken10](https://this-domain-does-not-exist-linkspector.example.com/page10) <!-- markdownlint-disable-line -->

[Broken11](https://this-domain-does-not-exist-linkspector.example.com/page11) <!-- linkspector-disable-line -->

This link should be checked: [Bing](https://www.bing.com)

<!-- linkspector-disable -->
[Broken6](https://this-domain-does-not-exist-linkspector.example.com/page6)
This is an unclosed disable block, so everything below should be ignored too.
[Broken7](https://this-domain-does-not-exist-linkspector.example.com/page7)
