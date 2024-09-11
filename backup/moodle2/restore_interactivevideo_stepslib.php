<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Structure step to restore one Interactivevideo activity
 *
 * @package    mod_interactivevideo
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class restore_interactivevideo_activity_structure_step extends restore_activity_structure_step {

    /**
     * Structure step to restore one interactivevideo activity
     *
     * @return array
     */
    protected function define_structure() {

        $paths = [];
        $userinfo = $this->get_setting_value('userinfo');

        $paths[] = new restore_path_element('interactivevideo', '/activity/interactivevideo');
        $paths[] = new restore_path_element('annotationitems', '/activity/interactivevideo/items/item');
        if ($userinfo) {
            $paths[] = new restore_path_element('completiondata', '/activity/interactivevideo/completiondata/completion');
            $paths[] = new restore_path_element('logdata', '/activity/interactivevideo/logdata/log');
        }

        // Return the paths wrapped into standard activity structure.
        return $this->prepare_activity_structure($paths);
    }

    /**
     * Process a interactivevideo restore
     *
     * @param array $data
     * @return void
     */
    protected function process_interactivevideo($data) {
        global $DB;

        $data = (object)$data;
        $oldid = $data->id;
        $data->course = $this->get_courseid();
        $data->timecreated = time();
        $data->timemodified = time();

        // Insert the interactivevideo record.
        $newitemid = $DB->insert_record('interactivevideo', $data);
        // Immediately after inserting "activity" record, call this.
        $this->apply_activity_instance($newitemid);
    }

    /**
     * Process a annotationitem restore
     *
     * @param array $data
     * @return void
     */
    protected function process_annotationitems($data) {
        global $DB;

        $data = (object)$data;
        $oldid = $data->id;
        $oldcourseid = $data->courseid;
        $data->timecreated = time();
        $data->timemodified = time();
        $data->courseid = $this->get_courseid();
        $data->cmid = $this->task->get_moduleid();
        $data->annotationid = $this->get_new_parentid('interactivevideo');
        // Let's deal with content bank content. If contentid is not null or not yet added to the mapping, we need to add it.
        if ($data->contentid) {
            $filecontenthash = $data->cbfilecontenthash;
            // Check if the file already exist in this context (e.g. restore by content bank restore process when course is copied).
            $file = $DB->get_record(
                'files',
                [
                    'contenthash' => $filecontenthash,
                    'contextid' => context_course::instance($this->get_courseid())->id,
                    'component' => 'contentbank',
                    'filearea' => 'public',
                ],
                'itemid'
            );
            if ($file) {
                $data->contentid = $file->itemid;
            } else {
                // Interactions might use the same content bank content, so we don't want to restore it twice.
                $exist = $this->get_mappingid('cbcontent', $data->contentid);
                if ($exist) {
                    $data->contentid = $exist;
                } else {
                    if ($oldcourseid != $this->get_courseid() || !$this->task->is_samesite()) {
                        $cbdata = new stdClass();
                        $cbdata->usercreated = $this->get_mappingid('user', $data->cbusercreated);
                        $cbdata->usermodified = $this->get_mappingid('user', $data->cbusermodified);
                        $cbdata->contextid = context_course::instance($this->get_courseid())->id;
                        $cbdata->instanceid = $data->cbinstanceid;
                        $cbdata->configdata = $data->cbconfigdata;
                        $cbdata->contenttype = $data->cbcontenttype;
                        $cbdata->timecreated = time();
                        $cbdata->timemodified = time();
                        $cbdata->name = $data->cbname;
                        $newcontentid = $DB->insert_record('contentbank_content', $cbdata);
                        $this->set_mapping('cbcontent', $data->contentid, $newcontentid, true, $data->cbcontextid);
                        $data->contentid = $newcontentid;

                        // Note to older self, add_related_files means the process will go through the files.xml
                        // in the backup file and restore the files that match the params provided.
                        $this->add_related_files('contentbank', 'public', 'cbcontent', $data->cbcontextid);
                    }
                }
            }
        }
        $newitemid = $DB->insert_record('interactivevideo_items', $data);
        $this->set_mapping('annotationitems', $oldid, $newitemid, true);
    }

    /**
     * Process a completion data restore
     *
     * @param array $data
     * @return void
     */
    protected function process_completiondata($data) {
        global $DB;

        $data = (object)$data;
        $oldid = $data->id;
        $data->cmid = $this->get_new_parentid('interactivevideo');
        $data->userid = $this->get_mappingid('user', $data->userid);
        $oldcompletionitems = json_decode($data->completeditems, true);
        $newcompletionitems = [];
        foreach ($oldcompletionitems as $olditemid) {
            $newitemid = $this->get_mappingid('annotationitems', $olditemid);
            if ($newitemid) {
                $newcompletionitems[] = strval($newitemid);
            }
        }
        $data->completeditems = json_encode($newcompletionitems);
        $newitemid = $DB->insert_record('interactivevideo_completion', $data);
        $this->set_mapping('completiondata', $oldid, $newitemid);
    }

    /**
     * Process a log data restore
     *
     * @param mixed $data
     * @return void
     */
    protected function process_logdata($data) {
        global $DB;

        $data = (object)$data;
        $oldid = $data->id;
        $data->cmid = $this->get_new_parentid('interactivevideo');
        $data->userid = $this->get_mappingid('user', $data->userid);
        $data->annotationid = $this->get_mappingid('annotationitems', $data->annotationid);
        $newitemid = $DB->insert_record('interactivevideo_log', $data);
        $this->set_mapping('logdata', $oldid, $newitemid, true);
    }

    /**
     * Actions to be executed after the restore is completed
     */
    protected function after_execute() {
        // Add interactivevideo related files, no need to match by itemname (just internally handled context).
        $this->add_related_files('mod_interactivevideo', 'intro', null);
        $this->add_related_files('mod_interactivevideo', 'endscreentext', null);
        $this->add_related_files('mod_interactivevideo', 'video', null);
        $this->add_related_files('mod_interactivevideo', 'content', 'annotationitems');
        $this->add_related_files('mod_interactivevideo', 'text1', 'logdata');
        $this->add_related_files('mod_interactivevideo', 'text2', 'logdata');
        $this->add_related_files('mod_interactivevideo', 'text3', 'logdata');
        $this->add_related_files('mod_interactivevideo', 'attachments', 'logdata');
    }
}
