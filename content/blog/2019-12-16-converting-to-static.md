---
title: "Migrating from WordPress To Hugo"
description: ""
date: "2019-12-16T14:37:02-06:00"
images:
 - /images/posts/wp-hugo.jpg
categories:
  - "Blog"
tags:
  - "Static Site Generators"
aliases:
  - "converting-to-static"
---

As you can see from the last post, this blog hasn't been updated in a while. For all intents and purposes, it's a static site.
So why not take this opportunity to test out static site generators?

For this, I'm using [Hugo](https://gohugo.io/). There's been a lot of stuff going around with these, but I haven't had a chance to test them out.
A _dead_ blog is a perfect place for this.

So here goes.

## Blog Changes
Before I got started I needed to prep my WordPress blog. I had to disable the [Jetpack](https://jetpack.com/) plugin I was using. This is because I was using the image optimization there. What this did was pull local content from Jetpack's CDN, which was a great feature for WordPress. The problem is, when I did the WordPress export, it still had those URLs linked to Jetpack instead of locally.

As a general rule, it might be a good idea to disable any plugins that modify content:
- Caching
- Minification
- Related/Top Posts
- etc.

## Comments
[Disqus](https://disqus.com) seemed to be the obvious way to go here. Not sure why I hadn't done this before. Seems like offloading comments to a third party would be a no-brainer.

I did have some issues importing the comments from WordPress it Disqus. The automatic import claimed to work, but I couldn't see the comments. I also tried manually importing comments; again, I didn't see anything.

After much deliberation, I learned two things:
1. You won't see the comments while debugging locally. (It could be an aspect of my theme)
2. Even when the site is deployed, the imported comments only show up in the domain name matches. I was deploying to the netlify.com domain and they weren't showing up.

## Domain Changes
This is somewhat unrelated, but I wanted to go ahead and get it done on WordPress before moving over to Hugo.

I wanted to add back the `www` to my domain name. I won't get into details here, but using the `www` subdomain for your site makes certain DNS level features easier to manage.
- [Cloudflare](https://www.cloudflare.com/) set up is easier at certain hosts.
- You can take advantage of [Azure Front Door](https://docs.microsoft.com/en-us/azure/frontdoor/front-door-overview)
- Netlify [Custom domains](https://docs.netlify.com/domains-https/custom-domains/) are easier to set up.

I changed this in the WordPress settings, did a database search and replace and also added Apache 301 Rewrite rules. If I cared enough about Google ranking, I would have waited a few weeks for all of my pages to get reindexed, but it wasn't that serious.

Again, this is less to do with Hugo and more to do with my preference, but it may be something you want to think about. Because once your site goes static, changing this is a little more difficult, depending on where you're hosted.

## Exporting to Hugo
You can check out the [Migrate To Hugo](https://gohugo.io/tools/migrations/#wordpress) page for details on exporting your WordPress settings, but I was successful in using [wordpress-to-hugo-exporter](https://github.com/SchumacherFM/wordpress-to-hugo-exporter). I just uploaded and hit export and I was done.

## Hugo Install
I'm just going to skip you to the [official documentation](https://gohugo.io/getting-started/installing/) for this. I'd also recommend doing some basic Hugo tutorials. Maybe you'll save yourself some of the headaches that I had.

After I installed Hugo, I created a new site `hugo new site my-blog`. Then I added the [Mainroad theme](https://themes.gohugo.io/mainroad/) to the `themes` folder.

After that, I copied the content of the export to the `content` folder and that was _almost_ it. The blog started showing up, kinda.

## Hugo Tweaks
Now, this is where I had to do some tweaks to get this just the way I wanted. I'm sure this was due to a combination of my lack of Hugo experience and/or the theme I selected. But here goes anyway.

For some reason, my content export included the following file: `content/index.md`. This file appeared to be a page that didn't get exported right. I renamed this and then posts started showing up on the home page as I expected.

My next issue was that my main menu was empty. I just looked up the documentation on my theme to figure out how to get some high-level pages to show up on my menu. That was easy enough.

I noticed that some images on my posts weren't displaying correctly. When I looked at the actual markdown file, the images were still in HTML. Hugo, by default, doesn't display HTML from markdown files. I had to add this configuration to my config.toml file:

```toml
[markup.goldmark.renderer]
  unsafe= true
```
## Summary and Future Steps
So the result is what you're seeing right now. It's blazing fast, of course, but then again a lot of _fluff_ has been ripped out. The dozens of WordPress plugins, etc.
Now I have nothing bad to say about WordPress, but based on the stagnant nature of this blog, this was the time to test out this path.

I haven't even cracked the surface of functionality in Hugo yet:
- Custom template types
- Data folder
- Page resources (resizing images and such)
- Site assets (apparently I can generate CSS from SASS, minify, add fingerprints to the JS and CSS assets)

My next step will be switching over my personal website.

This workflow seems nice and simple enough for the tech-savvy website owners.
I'd never dream of doing this for a customer site unless it was 100% fully managed by me and the theme/template was simple and clean.

I did try to convert another WordPress site over but trying to keep the existing theme. That was a total nightmare. But more for WordPress reasons than Hugo reasons.
The theme used a custom builder similar to [Divi](https://www.elegantthemes.com/gallery/divi/) or [Gutenberg](https://wordpress.org/gutenberg/).
There were a lot of different plugins, home page sliders, etc. I got the basic theme in place, but the content of each page was so heavy with mark-up, it was almost impossible to make things work.
If I was forced to, I would have had to create Hugo shortcodes to replicate what the builder generated. Needless to say, I abandoned that.

Well, here's to Hugo. So far so good.