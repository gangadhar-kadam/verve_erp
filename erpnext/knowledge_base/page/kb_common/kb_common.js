// ERPNext - web based ERP (http://erpnext.com)
// Copyright (C) 2012 Web Notes Technologies Pvt Ltd
// 
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

// question toolbar
// contains - voting widget / tag list and user info / timestamp
// By XXXXXX on YYYYY

KBItemToolbar = function(args, kb) {
	$.extend(this, args);
	var me = this;
	this.make = function() {
		this.wrapper = $a(this.parent, 'div', '', {});
		this.line1 = $a(this.wrapper, 'div', '', {color: '#888', fontSize:'11px', margin:'7px 0px'});
		this.make_timestamp();
		this.make_vote();
		if(this.with_tags)
			this.make_tags();
	}
	
	this.make_timestamp = function() {
		this.line1.innerHTML = repl('By %(name)s | %(when)s', {
			name: wn.utils.full_name(this.det.first_name, this.det.last_name),
			when: wn.datetime.comment_when(this.det.modified)
		});
		
		// allow system manager to delete questions / answers
		if(has_common(user_roles, ['Administrator', 'System Manager'])) {
			this.line1.innerHTML += ' | '
			$ln(this.line1, 'delete', me.del);
		}
	}

	this.make_vote = function() {
		this.line1.innerHTML += ' | '
		new KBPoints(this.line1, this.det.points, this.det._users_voted, this.doctype, this.det.name, this.det.owner);
	}
	
	this.del = function() {
		this.innerHTML = 'deleting...'; this.disabled = 1;
		$c_page('knowledge_base', 'questions', 'delete', {dt:me.doctype, dn:me.det.name}, function(r,rt) {
			// reload the list
			kb.list.run()
		});
	}
	
	this.make_tags = function() {
		this.line1.innerHTML += ' | '
		this.tags_area = $a(this.line1, 'span', 'kb-tags')
		this.tags = new TagList(this.tags_area, 
			this.det._user_tags && (this.det._user_tags.split(',')), 
			this.doctype, this.det.name, 0, kb.set_tag_filter)		
	}

	this.make();
}


// kb points
// x points | Vote Up | Vote Down (if not voted and not guest)
KBPoints = function(parent, points, voted, dt, dn, owner) {
	var me = this;
	voted = voted ? voted.split(',') : [];

	this.wrapper = $a(parent, 'span', '', {fontSize: '11px', marginRight: '7px', marginLeft: '7px'});
	
	this.render_points = function(p) {
		if(!this.points_area)
			this.points_area = $a(this.wrapper, 'span');
		this.points_area.innerHTML = cint(p) + ' point' + (p>1 ? 's' : '');			
	}
	
	this.render_points(points);
	
	// vote up or down
	// if user has not already voted
	
	if(user!='Guest' && !in_list(voted, user) && user!=owner) {
		this.vote_up = $a(this.wrapper, 'img', 'lib/images/ui/vote_up.gif', {margin:'0px 0px -2px 7px', cursor: 'pointer'});
		this.vote_down = $a(this.wrapper, 'img', 'lib/images/ui/vote_down.gif', {margin:'0px 0px -3px 0px', cursor: 'pointer'});
		
		this.vote_up.title = 'Vote Up'; this.vote_down.title = 'Vote Down';
		
		var callback = function(r, rt) {
			if(r.exc) { msgprint(r.exc); return; }
			$dh(me.vote_up); $dh(me.vote_down);
			me.render_points(r.message);
		}
		
		this.vote_up.onclick = function() {
			$c_page('knowledge_base', 'questions', 'vote', {vote:'up', dn:dn, dt:dt}, callback);
		}
		this.vote_down.onclick = function() {
			$c_page('knowledge_base', 'questions', 'vote', {vote:'down', dn:dn, dt:dt}, callback);
		}
	}
}

// displays an editable text,
// needs parent, text, disp_class, inp_class
// dt, dn

EditableText = function(args) {
	$.extend(this, args);
	var me = this;
	
	me.$w = $(repl('<div class="ed-text">\
		<div class="ed-text-display %(disp_class)s"></div>\
		<a class="ed-text-edit" style="cursor: pointer; float: right;">[edit]</a>\
		<textarea class="ed-text-input %(inp_class)s hide"></textarea><br>\
		<div class="help hide">Formatted as <a href="http://en.wikipedia.org/wiki/Markdown#Syntax_examples"\
		 	target="_blank">markdown</div>\
		<button class="btn btn-small btn-info hide ed-text-save">Save</button>\
		<a class="ed-text-cancel hide" style="cursor: pointer;">Cancel</a>\
	</div>', args)).appendTo(me.parent);
	
	this.set_display = function(txt) {
		me.$w.find('.ed-text-display').html(wn.markdown(txt));
		me.text = txt;
	}
	
	this.set_display(me.text);
	
	if(me.height) me.$w.find('.ed-text-input').css('height', me.height);
	
	// edit
	me.$w.find('.ed-text-edit').click(function() {
		me.$w.find('.ed-text-input').val(me.text);
		me.show_as_input();
	})
	
	// save button - save the new text
	me.$w.find('.ed-text-save').click(
		function() {
			var v = me.$w.find('.ed-text-input').val();
			// check if text is written
			if(!v) {
				msgprint('Please write something!');
				return;
			}
			var btn = this;
			$(btn).set_working();
			$c_page('knowledge_base', 'question_view', 'update_item', {
					dt: me.dt, dn: me.dn, fn: me.fieldname, text: v
				}, 
				function(r) {
					$(btn).done_working();
					if(r.exc) {msgprint(r.exc); return; }
					me.set_display(v);
					me.show_as_text();
				});
		}
	)
	

	// cancel button
	me.$w.find('.ed-text-cancel').click(function() {
		me.show_as_text();		
	})

	this.show_as_text = function() {
		me.$w.find('.ed-text-display, .ed-text-edit').toggle(true);
		me.$w.find('.ed-text-input, .ed-text-save, .ed-text-cancel, .help').toggle(false);
	}

	this.show_as_input = function() {
		me.$w.find('.ed-text-display, .ed-text-edit').toggle(false);
		me.$w.find('.ed-text-input, .ed-text-save, .ed-text-cancel, .help').toggle(true);
	}

}