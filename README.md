# Interactive Video #

Transform your video/audio content into an interactive learning adventure! Add dynamic annotations and interactions like H5P activities, PDFs, HTML games/simulations, rich text, and more. Track every learner’s journey with detailed reports.

Main Features:
- Media Support: Upload video/audio files or use YouTube, Vimeo, DailyMotion, Wistia, and direct file URLs.
- Interactive Content: Add interactions or content types at specific points in the video/audio.
- Display Modes: Choose from three display modes for interactions: inline (covering the video), popup (modal), and below the video.
- Customizable Timing: Set the start and end times for the video/audio.
- Distract-Free Mode: Display video/audio in a mode that maximizes focus.
- Completion Tracking: Track completion based on content type: manual, view, or automatic.
- Activity Completion: Set activity completion based on the percentage of interaction completed.
- Experience Points: Award participants experience points after each content/interaction completion.
- Detailed Reports: Access completion reports with details for each interaction.
- Mobile Support: Compatible with mobile apps.
- Modular Design: Administrators can add, remove, enable, or disable content types as sub-plugins. Developers can extend Interactive Video through custom sub-plugins.

Out-of-the-box interaction/content types:
- Annotations: Add persistan annotations on top of the video/canvas.
- Chapter: Break video/audio into segments.
- Content bank item: Add content from the course's content bank.
- Decision: Add a crossroad/decision point.
- External content: Embed an external content using OEmbed library.
- Form: Collect response from learners using Moodle's dynamic form.
- H5P viewer: Upload H5P activity in .h5p and .html format. (You can convert .h5p to .html using Lumi). Tracking completion using xAPI events is supported in both formats.
- HTML viewer: Include content such as HTML5 games, simulations, etc.
- PDF viewer: Display PDF file using PDFjs viewer.
- Paused annotation: Superimpose audio/image/video/text/shape/file on the video at a certain point.
- Skip segment: Skip certain segments of the video/audio.
- XP reward: Simply reward learners with XP points.

## Installing via uploaded ZIP file ##

1. Log in to your Moodle site as an admin and go to _Site administration >
   Plugins > Install plugins_.
2. Upload the ZIP file with the plugin code. You should only be prompted to add
   extra details if your plugin type is not automatically detected.
3. Check the plugin validation report and finish the installation.

## Installing manually ##

The plugin can be also installed by putting the contents of this directory to

    {your/moodle/dirroot}/mod/interactivevideo

Afterwards, log in to your Moodle site as an admin and go to _Site administration >
Notifications_ to complete the installation.

Alternatively, you can run

    $ php admin/cli/upgrade.php

to complete the installation from the command line.

## License ##

2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later
version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with
this program.  If not, see <https://www.gnu.org/licenses/>.
