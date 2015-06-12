$(document).ready(function(){

	$("#menu-button").on("click", function(){
		$(document.body).toggleClass("menu-opened");
	});

	var $sections = [],
		$links = $("#menu a[href^='#']");

	$links.each(function(){
		$sections.push($(this.getAttribute("href")));
	});

	$links.on("focus", function(){
		$(document.body).addClass("menu-opened");
	});

	function selectLink(id){
		$links.removeClass("active").filter("[href='#"+id+"']").addClass("active");
	}

	$(window).on("hashchange", function(){
		setTimeout(function(){
			selectLink(location.hash.slice(1));
		}, 1); //delay to trigger after scroll event
	});

	$(document).scroll(function(){
		var i,
			delta,
			nearest = { id: $sections[0].attr("id"), delta: Infinity },
			pos = $(this).scrollTop() + $(window).height() / 6;
		for(i=0; i<$sections.length; i++){
			delta = Math.abs(pos - $sections[i].offset().top);
			if(delta < nearest.delta){
				nearest.id = $sections[i].attr("id");
				nearest.delta = delta;
			}
		}
		selectLink(nearest.id);
	});

});